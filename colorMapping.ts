// Deterministic color mapping for charts
// Ported from monoscope web-components/src/colorMapping.ts for consistency
//
// SYNC WARNING: This is a copy of monoscope's colorMapping.ts
// When the source file changes, update this file to match.
// Source: monoscope/web-components/src/colorMapping.ts

const THEME_COLORS = [
  '#1A74A8', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4',
  '#c71585', '#37a2da', '#32c5e9', '#20b2aa', '#228b22', '#ff8c00', '#ff6347', '#dc143c',
  '#8b008b', '#4b0082', '#6a5acd', '#4169e1'
];

const STATUS_CODE_COLORS: Record<number, string> = {
  200: '#1A74A8', 201: '#37a2da', 202: '#32c5e9', 204: '#73c0de', 206: '#67e0e3',
  301: '#73c0de', 302: '#67e0e3', 304: '#9fe6b8', 307: '#3ba272', 308: '#91cc75',
  400: '#fac858', 401: '#ffdb5c', 403: '#ff9f7f', 404: '#fc8452', 405: '#fb7293', 429: '#e062ae',
  500: '#ee6666', 502: '#fb7293', 503: '#e062ae', 504: '#e690d1', 507: '#e7bcf3',
};

const PERCENTILE_COLORS: Record<string, string> = {
  'p50': '#91cc75', 'median': '#91cc75', 'p75': '#3ba272', 'q1': '#3ba272',
  'p90': '#fac858', 'p95': '#fc8452', 'q3': '#fc8452',
  'p99': '#dc2626', 'p100': '#991b1b', 'max': '#991b1b', 'min': '#91cc75',
};

const LOG_LEVEL_COLORS: Record<string, string> = {
  'error': '#ee6666', 'fail': '#ee6666', 'failed': '#ee6666', 'exception': '#e062ae',
  'critical': '#e062ae', 'warning': '#fac858', 'warn': '#fac858', 'success': '#91cc75',
  'ok': '#91cc75', 'info': '#73c0de', 'debug': '#9a60b4', 'trace': '#e7bcf3',
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getStatusCodeColor(code: number | string): string {
  if (typeof code === 'string') {
    const lc = code.toLowerCase();
    if (lc === '2xx') return '#1A74A8';
    if (lc === '3xx') return '#73c0de';
    if (lc === '4xx') return '#fac858';
    if (lc === '5xx') return '#ee6666';
  }
  const numCode = typeof code === 'string' ? parseInt(code, 10) : code;
  if (STATUS_CODE_COLORS[numCode]) return STATUS_CODE_COLORS[numCode];
  if (numCode >= 200 && numCode < 300) return '#67e0e3';
  if (numCode >= 300 && numCode < 400) return '#3ba272';
  if (numCode >= 400 && numCode < 500) return '#fb7293';
  if (numCode >= 500 && numCode < 600) return '#e7bcf3';
  return '#9d96f5';
}

function getPercentileColor(percentile: string): string {
  const key = percentile.toLowerCase().trim();
  return PERCENTILE_COLORS[key] ?? THEME_COLORS[hashString(percentile) % THEME_COLORS.length]!;
}

function getLogLevelColor(text: string): string {
  const normalized = text.toLowerCase().trim();
  const direct = LOG_LEVEL_COLORS[normalized];
  if (direct) return direct;
  for (const [pattern, color] of Object.entries(LOG_LEVEL_COLORS)) {
    if (normalized.includes(pattern)) return color;
  }
  return THEME_COLORS[hashString(text) % THEME_COLORS.length]!;
}

export function getSeriesColor(value: string): string {
  if (!value || value.trim() === '') return THEME_COLORS[0]!;
  const lv = value.toLowerCase();
  if (lv === 'null' || lv === 'undefined' || lv === 'unknown') return '#9ca3af';
  if (/^[2-5]\d{2}$/.test(value) || /^[2-5]xx$/i.test(value)) return getStatusCodeColor(value);
  if (/^(p|q)\d+|median|max|min/i.test(value)) return getPercentileColor(value);
  for (const pattern of Object.keys(LOG_LEVEL_COLORS)) {
    if (lv.includes(pattern)) return getLogLevelColor(value);
  }
  return THEME_COLORS[hashString(value) % THEME_COLORS.length]!;
}

// Apply colors to all series in ECharts options based on series names
export function applySeriesColors(options: any): any {
  if (!options?.dataset?.source || !Array.isArray(options.dataset.source)) return options;

  const source = options.dataset.source;
  if (source.length === 0) return options;

  // First row is headers: [timestamp, series1, series2, ...]
  const headers = source[0];
  if (!Array.isArray(headers) || headers.length < 2) return options;

  const seriesNames = headers.slice(1); // Skip timestamp column

  // Build series array with colors if not already defined
  if (!options.series || options.series.length === 0) {
    options.series = seriesNames.map((name: string, i: number) => ({
      type: 'bar',
      name,
      encode: { x: 0, y: i + 1 },
      itemStyle: { color: getSeriesColor(name) },
    }));
  } else {
    // Update existing series with colors if they don't have one
    options.series = options.series.map((s: any, i: number) => {
      const name = s.name || seriesNames[i] || `Series ${i + 1}`;
      if (!s.itemStyle?.color) {
        return { ...s, name, itemStyle: { ...s.itemStyle, color: getSeriesColor(name) } };
      }
      return s;
    });
  }

  return options;
}
