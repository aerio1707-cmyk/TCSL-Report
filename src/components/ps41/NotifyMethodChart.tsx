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

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 數值標籤加上圓角外框＋對應類別的淡色底色（比照參考截圖），底色用該類別
// 主色的透明版本，深色模式提高不透明度維持辨識度。
function valueLabelStyle(color: string, textColor: string, isDark: boolean) {
  return {
    show: true,
    position: "top" as const,
    fontWeight: 600,
    color: textColor,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    backgroundColor: hexToRgba(color, isDark ? 0.32 : 0.16),
    borderRadius: 4,
    padding: [3, 6] as [number, number],
  };
}

// 標籤盒子的實際渲染高度（fontSize 11 + 上下 padding 各 3），堆疊間距直接用
// 這個高度當作「無間距緊貼」的邊界，多一點點就會有縫隙、少一點點就會疊在一起。
const LABEL_BOX_HEIGHT = 20;
// 兩個數值在圖表上的相對位置（0~1，換算自各自座標軸的量測範圍）差距小於這個
// 門檻，就視為「太靠近會擋住底色」，需要垂直往上堆疊分開。
const STACK_COLLISION_THRESHOLD = 0.045;

type StackKey = "system" | "citizen" | "fail";

// 逐週計算三個數列（系統開單／民眾通報／FAIL）彼此需要往上堆疊幾層，用數值在
// 各自座標軸的正規化位置（0~1）判斷是否太靠近——兩個 y 軸共用同一塊繪圖區
// 高度，正規化位置可以直接跨軸比較，不需要另外呼叫 convertToPixel。
function computeStackLevels(
  weeks: WeeklyChannelBreakdown[],
  primaryMax: number,
  failMax: number,
  showFail: boolean
): Record<StackKey, number>[] {
  return weeks.map((w) => {
    const entries: { key: StackKey; norm: number }[] = [
      { key: "system", norm: w.systemCount / primaryMax },
      { key: "citizen", norm: w.citizenCount / primaryMax },
    ];
    if (showFail) entries.push({ key: "fail", norm: w.failCount / failMax });
    entries.sort((a, b) => a.norm - b.norm);

    const levels: Record<StackKey, number> = { system: 0, citizen: 0, fail: 0 };
    let level = 0;
    entries.forEach((entry, i) => {
      if (i > 0 && entry.norm - entries[i - 1].norm < STACK_COLLISION_THRESHOLD) {
        level++;
      } else {
        level = 0;
      }
      levels[entry.key] = level;
    });
    return levels;
  });
}

function stackedLabelLayout(levels: Record<StackKey, number>[], key: StackKey): echarts.LineSeriesOption["labelLayout"] {
  return (params) => ({ dy: -(levels[params.dataIndex ?? 0]?.[key] ?? 0) * LABEL_BOX_HEIGHT });
}

export function NotifyMethodChart({ title, rangeLabel, weeks, showFail }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = echarts.init(el);

    const render = () => {
      const isDark = prefersDark();
      const c = isDark ? COLORS.dark : COLORS.light;
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

      // 相近數值的標籤原本會直接疊在一起看不清楚（ECharts 內建的
      // labelLayout.moveOverlap 沒有把 backgroundColor/padding 的視覺大小算
      // 準，堆疊後盒子還是會互相蓋住），改成自己算每個數列在各週要往上堆疊
      // 幾層，堆疊間距固定用標籤盒子的實際高度，達到「盒子邊框無間距緊貼」。
      const primaryMax = Math.max(1, ...weeks.map((w) => Math.max(w.systemCount, w.citizenCount)));
      const failMax = Math.max(1, ...weeks.map((w) => w.failCount)) * 1.2;
      const stackLevels = computeStackLevels(weeks, primaryMax, failMax, showFail);

      const series: echarts.EChartsOption["series"] = [
        {
          name: "系統開單",
          type: "line",
          data: weeks.map((w) => w.systemCount),
          yAxisIndex: 0,
          label: valueLabelStyle(c.system, c.primaryInk, isDark),
          labelLayout: stackedLabelLayout(stackLevels, "system"),
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
          label: valueLabelStyle(c.citizen, c.primaryInk, isDark),
          labelLayout: stackedLabelLayout(stackLevels, "citizen"),
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
          label: valueLabelStyle(c.fail, c.primaryInk, isDark),
          labelLayout: stackedLabelLayout(stackLevels, "fail"),
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
