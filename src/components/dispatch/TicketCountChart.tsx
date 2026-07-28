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
        title: {
          text: "開單數量統計",
          subtext: rangeLabel,
          left: "center",
          top: 4,
          itemGap: 8,
          textStyle: { fontSize: 19, color: c.primaryInk, fontWeight: 600 },
          subtextStyle: { fontSize: 13, color: c.secondaryInk },
        },
        graphic: [
          {
            type: "rect",
            right: 24,
            top: 10,
            shape: { width: 108, height: 34, r: 17 },
            style: { fill: BADGE_FILL },
          },
          {
            type: "text",
            right: 78,
            top: 27,
            style: {
              text: `總計 ${total}`,
              fontWeight: "bold",
              fill: BADGE_TEXT,
              font: "16px sans-serif",
              align: "center",
              verticalAlign: "middle",
            },
          },
        ],
        // 標題區塊跟折線圖之間留出明確間距，避免副標題貼著圖表頂端。
        grid: { left: 48, right: 30, top: 130, bottom: 40 },
        xAxis: {
          type: "category",
          data: buckets.map((b) => b.label),
          axisLabel: { fontSize: 12, color: c.mutedInk },
          axisLine: { lineStyle: { color: c.baseline } },
          axisTick: { show: false },
        },
        yAxis: {
          type: "value",
          axisLabel: { color: c.mutedInk },
          splitLine: { lineStyle: { color: c.gridline, type: "solid" } },
        },
        series: [
          {
            type: "line",
            data: buckets.map((b) => b.total),
            label: { show: true, position: "top", fontWeight: 600, color: c.primaryInk },
            lineStyle: { color: c.line, width: 2 },
            itemStyle: { color: c.line, borderColor: "transparent" },
            symbol: "circle",
            symbolSize: 8,
          },
        ],
        tooltip: {
          trigger: "axis",
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
