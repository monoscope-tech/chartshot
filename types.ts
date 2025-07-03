export enum WidgetType {
  Group = "group",
  Logs = "logs",
  Timeseries = "timeseries",
  TimeseriesLine = "timeseries_line",
  TimeseriesStat = "timeseries_stat",
  Stat = "stat",
  List = "list",
  TopList = "top_list",
  Distribution = "distribution",
  Geomap = "geomap",
  Funnel = "funnel",
  TreeMap = "tree_map",
  PieChart = "pie_chart",
  Anomalies = "anomalies",
}

// Default for WidgetType
export const defaultWidgetType: WidgetType = WidgetType.Timeseries;

export enum SummarizeBy {
  Sum = "sum",
  Max = "max",
  Min = "min",
  Count = "count",
}

// Default for SummarizeBy
export const defaultSummarizeBy: SummarizeBy = SummarizeBy.Sum;

export function summarizeByPrefix(s: SummarizeBy): string {
  switch (s) {
    case SummarizeBy.Max:
      return "<";
    case SummarizeBy.Min:
      return ">";
    default:
      return "";
  }
}

export interface Widget {
  type: WidgetType;
  id?: string;
  naked?: boolean;
  showTooltip?: boolean;
  title?: string;
  subtitle?: string;
  hideSubtitle?: boolean;
  icon?: string;
  timeseriesStatAggregate?: string;
  sql?: string;
  summarizeBy?: SummarizeBy;
  query?: string;
  layout?: Layout;
  xAxis?: WidgetAxis;
  yAxis?: WidgetAxis;
  unit?: string;
  value?: number;
  data?: any;
  hideLegend?: boolean;
  legendPosition?: string;
  theme?: string;
  dataset?: WidgetDataset;
  eager?: boolean;
  projectId?: string;
  dashboardId?: string;
  isNested?: boolean;
  centerTitle?: boolean;
  expandBtnFn?: string;
  children?: Widget[];
  html?: string;
  standalone?: boolean;
  allowZoom?: boolean;
  showMarkArea?: boolean;
}

export interface WidgetDataset {
  source: any;
  rowsPerMin?: number;
  value?: number;
  from?: number;
  to?: number;
  stats?: MetricsStats;
}

export type ChartData = {
  from: number;
  to: number;
  headers: string[];
  dataset: any;
  rows_per_min: number;
  stats: MetricsStats;
};

export interface WidgetAxis {
  label?: string;
  showAxisLabel?: boolean;
  series?: WidgetAxis[];
  showOnlyMaxLabel?: boolean;
}

export interface Query {
  query?: string;
  sql?: string;
}

export interface Layout {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export interface MetricsStats {
  min: number;
  max: number;
  sum: number;
  count: number;
  mean: number;
  mode: number;
  max_group_sum: number;
}
