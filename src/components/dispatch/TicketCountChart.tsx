import * as echarts from "echarts";
import { useEffect, useRef } from "react";
import type { PeriodBucket } from "../../lib/caseFiles/buildTicketCountSeries";

interface Props {
  buckets: PeriodBucket[];
  rangeLabel: string;
}

// 依 dataviz 色票規範：單一數列用序列色階（藍）而不是隨手挑的顏色，
// 文字一律走 ink token（不能讓標籤跟數列共用同一個顏色），格線用比背景深一階的髮絲線。
const CHART_COLORS = {
  light: {
    line: "#2a78d6", // 序列色 450 階
    primaryInk: "#0b0b0b",
    secondaryInk: "#52514e",
    mutedInk: "#898781",
    gridline: "#e1e0d9",
    baseline: "#c3c2b7",
  },
  dark: {
    line: "#3987e5",
    primaryInk: "#ffffff",
    secondaryInk: "#c3c2b7",
    mutedInk: "#898781",
    gridline: "#2c2c2a",
    baseline: "#383835",
  },
};

// 徽章固定用深藍底＋白字（不隨主題切換），跟折線同一色系但更深、對比更夠，
// 不再是原本「淡黃底＋深咖啡邊框」那種互不相干的配色。
const BADGE_FILL = "#1c5cab";
const BADGE_TEXT = "#ffffff";
const BADGE_WIDTH = 128;
const BADGE_HEIGHT = 40;
const BADGE_FONT_SIZE = 18;

// 中文用新細明體、英數字用 Calibri：瀏覽器依字元找不到 Calibri 的字形（中文）時，
// 會自動往後找到新細明體，兩種字元各自吃到指定字體，不需要另外拆字串分開畫。
const FONT_FAMILY = "Calibri, 'PMingLiU', '新細明體', sans-serif";

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function TicketCountChart({ buckets, rangeLabel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = echarts.init(el);
    const total = buckets.reduce((sum, b) => sum + b.total, 0);

    const render = () => {
      const c = prefersDark() ? CHART_COLORS.dark : CHART_COLORS.light;

      const option: echarts.EChartsOption = {
        textStyle: { fontFamily: FONT_FAMILY },
        title: {
          text: "開單數量統計",
          subtext: rangeLabel,
          left: "center",
          top: 4,
          itemGap: 8,
          textStyle: { fontSize: 23, color: c.primaryInk, fontWeight: 600, fontFamily: FONT_FAMILY },
          subtextStyle: { fontSize: 13, color: c.secondaryInk, fontFamily: FONT_FAMILY },
        },
        graphic: [
          {
            // rect 跟 text 包在同一個 group 裡，文字用 group 內的區域座標定位
            // （x/y 直接抓寬高的一半），不管總計是 3 位數還是 4 位數，文字的
            // 置中錨點都固定在矩形正中央，不會因為文字量測寬度不同而偏移。
            type: "group",
            right: 24,
            top: 10,
            children: [
              {
                type: "rect",
                shape: { x: 0, y: 0, width: BADGE_WIDTH, height: BADGE_HEIGHT, r: BADGE_HEIGHT / 2 },
                style: { fill: BADGE_FILL },
              },
              {
                type: "text",
                x: BADGE_WIDTH / 2,
                y: BADGE_HEIGHT / 2,
                style: {
                  text: `總計 ${total}`,
                  fontWeight: "bold",
                  fill: BADGE_TEXT,
                  fontSize: BADGE_FONT_SIZE,
                  fontFamily: FONT_FAMILY,
                  align: "center",
                  verticalAlign: "middle",
                },
              },
            ],
          },
        ],
        // 標題區塊跟折線圖之間留出明確間距，避免副標題貼著圖表頂端。
        grid: { left: 48, right: 30, top: 130, bottom: 40 },
        xAxis: {
          type: "category",
          data: buckets.map((b) => b.label),
          axisLabel: { fontSize: 12, color: c.mutedInk, fontFamily: FONT_FAMILY },
          axisLine: { lineStyle: { color: c.baseline } },
          axisTick: { show: false },
        },
        yAxis: {
          type: "value",
          axisLabel: { color: c.mutedInk, fontFamily: FONT_FAMILY },
          splitLine: { lineStyle: { color: c.gridline, type: "solid" } },
        },
        series: [
          {
            type: "line",
            data: buckets.map((b) => b.total),
            label: { show: true, position: "top", fontWeight: 600, color: c.primaryInk, fontFamily: FONT_FAMILY },
            lineStyle: { color: c.line, width: 2 },
            itemStyle: { color: c.line, borderColor: "transparent" },
            symbol: "circle",
            symbolSize: 8,
          },
        ],
        tooltip: {
          trigger: "axis",
          textStyle: { fontFamily: FONT_FAMILY },
          formatter: (params) => {
            const first = Array.isArray(params) ? params[0] : params;
            const idx = typeof first.dataIndex === "number" ? first.dataIndex : 0;
            const bucket = buckets[idx];
            if (!bucket) return "";
            const lines = bucket.categories.map((cat) => `${cat.category}：${cat.count}`);
            return [`${bucket.label}（總計 ${bucket.total}）`, ...lines].join("<br/>");
          },
        },
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
  }, [buckets, rangeLabel]);

  return <div ref={containerRef} style={{ width: "100%", height: 420 }} />;
}
