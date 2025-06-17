import { serve } from "bun";
import { createCanvas } from "canvas";
import * as echarts from "echarts";

const PORT = 3001;

type WidgetDataset = any; // Replace with specific type

interface Widget {
  chartType: string;
  echartOptions: any;
  chartData: {
    from: number;
    to: number;
    headers: string[];
    dataset: WidgetDataset;
    rows_per_min: number;
    stats: any;
  };
}

serve({
  port: PORT,
  fetch: async (req: Request) => {
    try {
      const url = new URL(req.url);
      const chartOptionsParam = url.searchParams.get("chartOptions");

      if (!chartOptionsParam) {
        return new Response(
          JSON.stringify({ error: "Missing chartOptions query parameter." }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const chartOptions: Widget = JSON.parse(chartOptionsParam);
      const { from, to, headers, dataset, rows_per_min, stats } =
        chartOptions.chartData;
      const opt = chartOptions.echartOptions;

      opt.backgroundColor = "#ffffff";
      opt.xAxis = opt.xAxis || {};
      opt.xAxis.min = from * 1000;
      opt.xAxis.max = to * 1000;
      opt.grid = {
        ...opt.grid,
        left: "5px",
        right: "5px",
        containLabel: true,
      };
      opt.title = {
        text: "",
        left: "center",
        top: 10,
        textStyle: {
          fontSize: 16,
          fontWeight: "bold",
          color: "#333",
        },
      };
      opt.yAxis.axisLabel = {
        formatter: function (value: number, index: number) {
          return formatNumber(value);
        },
      };
      opt.dataset.source = [
        headers,
        ...dataset.map((row: any) => [row[0] * 1000, ...row.slice(1)]),
      ];
      opt.yAxis.max = stats.max;
      opt.series = createSeriesConfig(chartOptions.chartType, "discord", 0);

      const base64 = renderChart(opt);
      return new Response(JSON.stringify(base64), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      });
    } catch (error) {
      console.error("Error generating chart:", error);
      return new Response(JSON.stringify({ error: "Internal server error." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});

console.log(`Server is running on http://localhost:${PORT}`);

function renderChart(options: any) {
  const canvas = createCanvas(600, 300);
  const chart = echarts.init(canvas as any);
  options.animation = false;
  chart.setOption(options);
  const base64 = canvas.toBuffer("image/png");
  chart.dispose();
  return base64;
}

const DEFAULT_BACKGROUND_STYLE = { color: "rgba(240,248,255, 0.4)" };
const DEFAULT_PALETTE = [
  "#1A74A8",
  "#067A57CC",
  "#EE6666",
  "#FAC858",
  "#73C0DE",
  "#3BA272",
  "#FC8452",
  "#9A60B4",
  "#ea7ccc",
];

const createSeriesConfig = (chartType: string, name: string, i: number) => {
  const palette = DEFAULT_PALETTE;
  const paletteColor = palette[i % palette.length];

  const seriesOpt: any = {
    type: chartType,
    name,
    stack: chartType === "line" ? undefined : "units",
    showSymbol: false,
    showBackground: true,
    backgroundStyle: DEFAULT_BACKGROUND_STYLE,
    barMaxWidth: "10",
    barMinHeight: "1",
    encode: { x: 0, y: i + 1 },
  };

  return seriesOpt;
};

const formatNumber = (n: number): string => {
  if (n >= 1_000_000_000)
    return `${Math.floor(n / 1_000_000_000)}.${Math.floor(
      (n % 1_000_000_000) / 100_000_000
    )}B`;
  if (n >= 1_000_000)
    return `${Math.floor(n / 1_000_000)}.${Math.floor(
      (n % 1_000_000) / 100_000
    )}M`;
  if (n >= 1_000)
    return `${Math.floor(n / 1_000)}.${Math.floor((n % 1_000) / 100)}K`;

  // Format decimals appropriately based on magnitude
  if (!Number.isInteger(n)) {
    if (n >= 100) return Math.round(n).toString();
    if (n >= 10) return parseFloat(n.toFixed(1)).toString();
    return parseFloat(n.toFixed(2)).toString();
  }

  return n.toString();
};
