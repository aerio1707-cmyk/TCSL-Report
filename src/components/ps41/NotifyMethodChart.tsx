import * as echarts from "echarts";
import { useEffect, useRef } from "react";
import type { WeeklyChannelBreakdown } from "../../lib/ps41/types";

interface Props {
  title: string;
  rangeLabel: string;
  weeks: WeeklyChannelBreakdown[];
  showFail: boolean; // 非清冊圖表沒有 FAIL 長條
}

// 沿用 TicketCountChart 已驗證的 dataviz 色票規範：序列色階＋ink token 文字＋
// 髮絲格線；三個徽章（系統開單/民眾通報/FAIL）分開上色，比照參考截圖的
// 藍/淡黃/紅三色徽章。
const COLORS = {
  light: {
    system: "#2a78d6",
    citizen: "#c97a2b",
    fail: "#dc2626",
    primaryInk: "#0b0b0b",
    secondaryInk: "#52514e",
    mutedInk: "#898781",
    gridline: "#e1e0d9",
    baseline: "#c3c2b7",
  },
  dark: {
    system: "#3987e5",
    citizen: "#e0954a",
    fail: "#ef4444",
    primaryInk: "#ffffff",
    secondaryInk: "#c3c2b7",
    mutedInk: "#898781",
    gridline: "#2c2c2a",
    baseline: "#383835",
  },
};

const BADGE_TEXT = "#ffffff";
const BADGE_WIDTH = 132;
const BADGE_HEIGHT = 36;
const BADGE_GAP = 10;
const BADGE_FONT_SIZE = 15;
const FONT_FAMILY = "Calibri, 'PMingLiU', '新細明體', sans-serif";

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function NotifyMethodChart({ title, rangeLabel, weeks, showFail }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = echarts.init(el);

    const render = () => {
      const c = prefersDark() ? COLORS.dark : COLORS.light;
      const systemTotal = weeks.reduce((s, w) => s + w.systemCount, 0);
      const citizenTotal = weeks.reduce((s, w) => s + w.citizenCount, 0);
      const failTotal = weeks.reduce((s, w) => s + w.failCount, 0);

      const badges: { label: string; total: number; fill: string }[] = [
        { label: "系統開單", total: systemTotal, fill: c.system },
        { label: "民眾通報", total: citizenTotal, fill: c.citizen },
      ];
      if (showFail) badges.push({ label: "FAIL", total: failTotal, fill: c.fail });

      const graphic: echarts.EChartsOption["graphic"] = badges.map((b, i) => ({
        type: "group",
        right: 24 + (badges.length - 1 - i) * (BADGE_WIDTH + BADGE_GAP),
        top: 54, // 標題+副標題在上方獨立一列，徽章另起一列避免三個徽章時跟標題文字重疊

        children: [
          {
            type: "rect",
            shape: { x: 0, y: 0, width: BADGE_WIDTH, height: BADGE_HEIGHT, r: BADGE_HEIGHT / 2 },
            style: { fill: b.fill },
          },
          {
            type: "text",
            x: BADGE_WIDTH / 2,
            y: BADGE_HEIGHT / 2,
            style: {
              text: `${b.label} ${b.total}`,
              fontWeight: "bold",
              fill: BADGE_TEXT,
              fontSize: BADGE_FONT_SIZE,
              fontFamily: FONT_FAMILY,
              align: "center",
              verticalAlign: "middle",
            },
          },
        ],
      }));

      const series: echarts.EChartsOption["series"] = [
        {
          name: "系統開單",
          type: "line",
          data: weeks.map((w) => w.systemCount),
          yAxisIndex: 0,
          label: { show: true, position: "top", fontWeight: 600, color: c.primaryInk, fontFamily: FONT_FAMILY, fontSize: 11 },
          lineStyle: { color: c.system, width: 2 },
          itemStyle: { color: c.system },
          symbol: "circle",
          symbolSize: 7,
        },
        {
          name: "民眾通報",
          type: "line",
          data: weeks.map((w) => w.citizenCount),
          yAxisIndex: 0,
          label: { show: true, position: "top", fontWeight: 600, color: c.primaryInk, fontFamily: FONT_FAMILY, fontSize: 11 },
          lineStyle: { color: c.citizen, width: 2 },
          itemStyle: { color: c.citizen },
          symbol: "circle",
          symbolSize: 7,
        },
      ];
      if (showFail) {
        series.unshift({
          name: "FAIL",
          type: "bar",
          data: weeks.map((w) => w.failCount),
          yAxisIndex: 1,
          itemStyle: { color: c.fail },
          barWidth: "40%",
        });
      }

      const option: echarts.EChartsOption = {
        textStyle: { fontFamily: FONT_FAMILY },
        title: {
          text: title,
          subtext: rangeLabel,
          left: "center",
          top: 4,
          itemGap: 8,
          textStyle: { fontSize: 21, color: c.primaryInk, fontWeight: 600, fontFamily: FONT_FAMILY },
          subtextStyle: { fontSize: 13, color: c.secondaryInk, fontFamily: FONT_FAMILY },
        },
        graphic,
        grid: { left: 48, right: 56, top: 195, bottom: 60 },
        legend: { top: 130, textStyle: { color: c.secondaryInk, fontFamily: FONT_FAMILY } },
        xAxis: {
          type: "category",
          data: weeks.map((w) => w.weekLabel),
          axisLabel: { fontSize: 11, color: c.mutedInk, fontFamily: FONT_FAMILY, rotate: 45 },
          axisLine: { lineStyle: { color: c.baseline } },
          axisTick: { show: false },
        },
        yAxis: showFail
          ? [
              {
                type: "value",
                name: "系統開單／民眾通報",
                axisLabel: { color: c.mutedInk, fontFamily: FONT_FAMILY },
                splitLine: { lineStyle: { color: c.gridline, type: "solid" } },
              },
              {
                type: "value",
                name: "FAIL",
                min: 0,
                // 格線上限值要略高於最高的 FAIL 數值，不然長條頂端的數字標籤會被
                // 上方徽章/圖例擋住看不到（例如最大值=1 時，軸上限至少要到 1.2）。
                max: (value: { max: number }) => Math.max(1, value.max) * 1.2,
                axisLabel: { color: c.mutedInk, fontFamily: FONT_FAMILY },
                splitLine: { show: false },
              },
            ]
          : {
              type: "value",
              axisLabel: { color: c.mutedInk, fontFamily: FONT_FAMILY },
              splitLine: { lineStyle: { color: c.gridline, type: "solid" } },
            },
        series,
        tooltip: { trigger: "axis", textStyle: { fontFamily: FONT_FAMILY } },
      };

      chart.setOption(option, true);
    };

    render();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", render);
    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      media.removeEventListener("change", render);
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [title, rangeLabel, weeks, showFail]);

  return <div ref={containerRef} style={{ width: "100%", height: 460 }} />;
}
