import * as echarts from "echarts";
import { useEffect, useRef } from "react";
import type { PeriodBucket } from "../../lib/caseFiles/buildTicketCountSeries";

interface Props {
  buckets: PeriodBucket[];
  rangeLabel: string;
}

export function TicketCountChart({ buckets, rangeLabel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = echarts.init(el);
    const total = buckets.reduce((sum, b) => sum + b.total, 0);

    const option: echarts.EChartsOption = {
      title: {
        text: "開單數量統計",
        subtext: rangeLabel,
        left: "center",
        textStyle: { fontSize: 16 },
        subtextStyle: { fontSize: 13 },
      },
      graphic: [
        {
          type: "rect",
          right: 24,
          top: 8,
          shape: { width: 92, height: 28, r: 4 },
          style: { fill: "#fde68a", stroke: "#78350f", lineWidth: 1 },
        },
        {
          type: "text",
          right: 70,
          top: 16,
          style: {
            text: `總計 ${total}`,
            fontWeight: "bold",
            fill: "#78350f",
            font: "13px sans-serif",
          },
        },
      ],
      grid: { left: 48, right: 30, top: 90, bottom: 40 },
      xAxis: {
        type: "category",
        data: buckets.map((b) => b.label),
        axisLabel: { fontSize: 12 },
      },
      yAxis: { type: "value" },
      series: [
        {
          type: "line",
          data: buckets.map((b) => b.total),
          label: { show: true, position: "top", fontWeight: "bold" },
          lineStyle: { color: "#f5a623", width: 3 },
          itemStyle: { color: "#f5a623" },
          symbol: "circle",
          symbolSize: 6,
        },
      ],
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          const first = Array.isArray(params) ? params[0] : params;
          const idx = typeof first.dataIndex === "number" ? first.dataIndex : 0;
          const bucket = buckets[idx];
          if (!bucket) return "";
          const lines = bucket.categories.map((c) => `${c.category}：${c.count}`);
          return [`${bucket.label}（總計 ${bucket.total}）`, ...lines].join("<br/>");
        },
      },
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [buckets, rangeLabel]);

  return <div ref={containerRef} style={{ width: "100%", height: 380 }} />;
}
