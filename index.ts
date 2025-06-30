import { serve } from "bun";
import { createCanvas } from "canvas";
import * as echarts from "echarts";

const PORT = 3001;

type WidgetDataset = any; // Replace with specific type

type ChartData = {
  from: number;
  to: number;
  headers: string[];
  dataset: WidgetDataset;
  rows_per_min: number;
  stats: any;
};

const theme = (await fetch(
  `${process.env.APITOOLKIT_URL}/public/assets/echart-theme.json`
).then((res) => res.json())) as { roma: any; default: any };

serve({
  port: PORT,
  fetch: async (req: Request) => {
    try {
      const url = new URL(req.url);
      const query = url.searchParams.get("q");
      const pid = url.searchParams.get("p");
      const chartType = url.searchParams.get("t") || "bar";
      const fromQ = url.searchParams.get("from");
      const toQ = url.searchParams.get("to");
      const theme = url.searchParams.get("theme") || "default";

      if (!query || !pid) {
        return new Response(
          JSON.stringify({ error: "Missing required query parameter." }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      const params = new URLSearchParams();
      params.set("query", query);
      params.set("pid", pid);
      fromQ && params.set("from", fromQ);
      toQ && params.set("to", toQ);
      const aptUrl = `${
        process.env.APITOOLKIT_URL
      }/chart_data_shot?${params.toString()}`;
      const { from, to, headers, dataset, rows_per_min, stats } = (await fetch(
        aptUrl,
        {
          headers: { "X-Server-Token": "86186133-814f-4443-9973-f737d03a3986" },
        }
      ).then((res) => {
        return res.json();
      })) as ChartData;

      options.backgroundColor = "#ffffff";
      options.xAxis = options.xAxis || {};
      options.xAxis.min = from * 1000;
      options.xAxis.max = to * 1000;
      options.grid = {
        ...options.grid,
        containLabel: true,
      };
      options.title = {
        text: "",
        left: "center",
        top: 10,
        textStyle: {
          fontSize: 16,
          fontWeight: "bold",
          color: "#333",
        },
      };
      options.yAxis.axisLabel = {
        formatter: function (value: number, index: number) {
          return formatNumber(value);
        },
      };
      options.dataset.source = [
        headers,
        ...dataset.map((row: any) => [row[0] * 1000, ...row.slice(1)]),
      ];
      options.yAxis.max = stats.max;
      options.series = createSeriesConfig(chartType, "discord", 0);

      const base64 = renderChart(options, theme);
      return new Response(base64, {
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

function renderChart(options: any, thm: string = "default") {
  const canvas = createCanvas(600, 300);
  echarts.registerTheme("default", theme.default);
  echarts.registerTheme("roma", theme.roma);
  const chart = echarts.init(canvas as any, thm);
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

const options: any = {
  tooltip: {
    show: true,
    trigger: "axis",
    axisPointer: {
      type: "shadow",
    },
  },
  legend: {
    show: false,
    type: "scroll",
    top: "bottom",
    textStyle: {
      fontSize: 12,
    },
    itemWidth: 14,
    itemHeight: 12,
    itemGap: 8,
    padding: [2, 4, 2, 4],
    data: [],
  },
  grid: {
    left: "2%",
    right: "2%",
    top: "10%",
    bottom: "15%",
    containLabel: true,
    show: false,
  },
  xAxis: {
    type: "time",
    scale: true,
    min: null,
    max: null,
    boundaryGap: [0, 0.01],
    splitLine: {
      show: false,
    },
    axisLine: {
      show: true,
      lineStyle: {
        color: "#000833A6",
        type: "solid",
        opacity: 0.1,
      },
    },
    axisLabel: {
      show: true,
    },
    show: true,
  },
  yAxis: {
    type: "value",
    min: 0,
    max: null,
    splitLine: {
      show: true,
      lineStyle: {
        type: "dotted",
        color: "#0011661A",
      },
      interval: null,
    },
    axisTick: {
      show: false,
    },
    axisLine: {
      show: false,
    },
    axisLabel: {
      show: true,
      inside: false,
      formatter: "function(value, index) { return formatNumber(value); }",
    },
    show: true,
  },
  dataset: {
    source: null,
  },
  series: [],
};
