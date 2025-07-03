import { serve } from "bun";
import { createCanvas } from "canvas";
import * as echarts from "echarts";
import { WidgetType, type ChartData, type Query, type Widget } from "./types";

const PORT = 3001;

const theme = (await fetch(
  `${process.env.APITOOLKIT_URL}/public/assets/echart-theme.json`
).then((res) => res.json())) as { roma: any; default: any };

serve({
  port: PORT,
  fetch: async (req: Request) => {
    try {
      const url = new URL(req.url);
      const query = url.searchParams.get("q");
      const sql = url.searchParams.get("sql");
      const pid = url.searchParams.get("p");
      const fromQ = url.searchParams.get("from");
      const toQ = url.searchParams.get("to");

      // get widget data from query parameter
      const widget = url.searchParams.get("widget");
      console.log(widget);
      const widgetData = parseWidgetJson(widget || "");

      console.log(widgetData);

      let theme = url.searchParams.get("theme") || "default";
      let chartType: WidgetType = url.searchParams.get("t")
        ? (url.searchParams.get("t") as WidgetType)
        : WidgetType.Timeseries;

      if (!pid) {
        return new Response(
          JSON.stringify({ error: "Missing required query parameter." }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      const params = new URLSearchParams();
      params.set("pid", pid);
      fromQ && params.set("from", fromQ);
      toQ && params.set("to", toQ);

      if (widgetData) {
        chartType = widgetData.type || chartType;
        theme = widgetData.theme || theme;
        widgetData.sql && params.set("query_sql", widgetData.sql);
        widgetData.query && params.set("query", widgetData.query);
      } else {
        params.set("query", query || "");
        sql && params.set("query_sql", sql);
      }

      const aptUrl = `${
        process.env.APITOOLKIT_URL
      }/chart_data_shot?${params.toString()}`;
      const { from, to, headers, dataset, rows_per_min, stats } = (await fetch(
        aptUrl,
        {
          headers: { "X-Server-Token": "86186133-814f-4443-9973-f737d03a3986" },
        }
      ).then((res) => {
        console.log(res);
        return res.json();
      })) as ChartData;
      const options = widgetToECharts(
        widgetData || { type: WidgetType.Timeseries }
      );
      options.backgroundColor = "#ffffff";
      options.xAxis = options.xAxis || {};
      options.xAxis.min = from * 1000;
      options.xAxis.max = to * 1000;
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
      if (chartType != WidgetType.TimeseriesLine) {
        options.yAxis.max = stats.max_group_sum;
      }
      options.series = createSeriesConfig(
        widgetData || { type: WidgetType.Timeseries },
        0,
        echarts
      );

      // createSeries(
      //   widgetData?.type || WidgetType.Timeseries,
      //   widgetData || {}
      // );

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

function parseWidgetJson(widgetJson: string) {
  try {
    return JSON.parse(widgetJson) as Widget;
  } catch (error) {
    console.error("Error parsing widget JSON:", error);
    return null;
  }
}

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

export function widgetToECharts(widget: Widget): Record<string, any> {
  const isStat = widget.type === WidgetType.TimeseriesStat;
  const axisVisibility = !isStat;
  const gridLinesVisibility = !isStat;
  const legendVisibility = !isStat && widget.hideLegend !== true;

  return {
    tooltip: {
      show: widget.showTooltip ?? true,
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
    },
    legend: {
      show: legendVisibility,
      type: "scroll",
      top: widget.legendPosition ?? "bottom",
      textStyle: { fontSize: 12 },
      itemWidth: 14,
      itemHeight: 12,
      itemGap: 8,
      padding: [2, 4, 2, 4],
    },
    grid: {
      width: "100%",
      left: "0%",
      top:
        widget.legendPosition === "top" && legendVisibility
          ? "18%"
          : widget.naked === true
          ? "10%"
          : "5%",
      bottom:
        widget.legendPosition !== "top" && legendVisibility ? "18%" : "1.8%",
      containLabel: true,
      show: false,
    },
    xAxis: {
      type: "time",
      scale: true,
      min: widget.dataset?.from ? widget.dataset.from * 1000 : null,
      max: widget.dataset?.to ? widget.dataset.to * 1000 : null,
      boundaryGap: [0, 0.01],
      splitLine: { show: false },
      axisLine: {
        show: axisVisibility,
        lineStyle: {
          color: "#000833A6",
          type: "solid",
          opacity: 0.1,
        },
      },
      axisLabel: {
        show: axisVisibility && (widget.xAxis?.showAxisLabel ?? true),
      },
      show: axisVisibility || (widget.xAxis?.showAxisLabel ?? false),
    },
    yAxis: {
      type: "value",
      min: 0,
      max: widget.dataset?.stats?.max_group_sum ?? null,
      splitLine: {
        show: gridLinesVisibility,
        lineStyle: {
          type: "dotted",
          color: "#0011661A",
        },
        interval: widget.yAxis?.showOnlyMaxLabel
          ? "function(index, value) { return value === this.yAxis.max }"
          : null,
      },
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        show: axisVisibility && (widget.yAxis?.showAxisLabel ?? true),
        inside: false,
        formatter: widget.yAxis?.showOnlyMaxLabel
          ? `function(value, index) { return (value === this.yAxis.max || value == 0) ? formatNumber(value) : ''; }`
          : "function(value, index) { return formatNumber(value); }",
      },
      show: axisVisibility,
    },
    dataset: {
      source: widget.dataset?.source ?? null,
    },
    animation: false,
  };
}

const createSeriesConfig = (widgetData: Widget, i: number, echarts: any) => {
  const t = widgetData.theme === "roma" ? "roma" : "default";
  const palette = theme[t].color || DEFAULT_PALETTE;
  let paletteColor = palette[i % palette.length];

  // const gradientColor = echarts.graphic.LinearGradient(0, 0, 0, 1, [
  //   { offset: 0, color: echarts.color.modifyAlpha(paletteColor, 1) },
  //   { offset: 1, color: echarts.color.modifyAlpha(paletteColor, 0) },
  // ]);
  const chartType = mapWidgetTypeToChartType(widgetData.type);
  const seriesOpt: any = {
    type: chartType,
    name: widgetData.query || widgetData.sql || "Unnamed",
    stack:
      chartType === "line" ? undefined : widgetData.yAxis?.label || "units",
    showSymbol: false,
    showBackground: true,
    backgroundStyle: DEFAULT_BACKGROUND_STYLE,
    barMaxWidth: "10",
    barMinHeight: "1",
    encode: { x: 0, y: i + 1 },
  };

  if (widgetData.type == "timeseries_stat") {
    // seriesOpt.itemStyle = { color: gradientColor };
    // seriesOpt.areaStyle = { color: gradientColor };
  }

  return seriesOpt;
};

export function mapWidgetTypeToChartType(widgetType: WidgetType): string {
  switch (widgetType) {
    case WidgetType.Timeseries:
      return "bar";
    case WidgetType.TimeseriesLine:
    case WidgetType.TimeseriesStat:
      return "line";
    case WidgetType.Distribution:
      return "bar";
    default:
      return "bar";
  }
}
