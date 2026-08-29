// Deterministic color mapping for charts
// Ported from monoscope web-components/src/colorMapping.ts for consistency
//
// SYNC WARNING: This is a copy of monoscope's colorMapping.ts
// When the source file changes, update this file to match.
// Source: monoscope/web-components/src/colorMapping.ts

const LIGHT_THEME_COLORS = [
  '#2563eb', '#dc2626', '#15803d', '#b45309', '#9333ea', '#0f766e',
  '#c2410c', '#0369a1', '#e11d48', '#4d7c0f', '#4f46e5', '#a16207',
  '#be185d', '#047857', '#7c3aed', '#0e7490', '#a21caf', '#475569',
  '#1d4ed8', '#b91c1c'
];
const DARK_THEME_COLORS = [
  '#60a5fa', '#f87171', '#4ade80', '#fbbf24', '#c084fc', '#2dd4bf',
  '#fb923c', '#38bdf8', '#fb7185', '#a3e635', '#818cf8', '#facc15',
  '#f472b6', '#34d399', '#a78bfa', '#22d3ee', '#e879f9', '#94a3b8',
  '#73c0de', '#ee6666'
];
type Theme = 'light' | 'dark';
const themeColors = (theme: Theme) => theme === 'dark' ? DARK_THEME_COLORS : LIGHT_THEME_COLORS;

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

function getStatusCodeColor(code: number | string, theme: Theme): string {
  const grouped = typeof code === 'string' && /^[2-5]xx$/i.test(code) ? Number(code[0]) * 100 : Number(code);
  const dark = theme === 'dark';
  if (grouped >= 200 && grouped < 300) return dark ? '#34d399' : '#047857';
  if (grouped >= 300 && grouped < 400) return dark ? '#38bdf8' : '#0369a1';
  if (grouped >= 400 && grouped < 500) return dark ? '#fbbf24' : '#b45309';
  if (grouped >= 500 && grouped < 600) return dark ? '#f87171' : '#dc2626';
  return themeColors(theme)[4]!;
}

function getPercentileColor(percentile: string, theme: Theme): string {
  const key = percentile.toLowerCase().trim();
  const colors: Record<string, string> = theme === 'dark'
    ? { p50: '#4ade80', median: '#4ade80', p75: '#34d399', q1: '#34d399', p90: '#fbbf24', p95: '#fb923c', q3: '#fb923c', p99: '#f87171', p100: '#fb7185', max: '#fb7185', min: '#4ade80' }
    : { p50: '#15803d', median: '#15803d', p75: '#047857', q1: '#047857', p90: '#a16207', p95: '#c2410c', q3: '#c2410c', p99: '#dc2626', p100: '#be123c', max: '#be123c', min: '#15803d' };
  const palette = themeColors(theme);
  return colors[key] ?? palette[hashString(percentile) % palette.length]!;
}

function getLogLevelColor(text: string, theme: Theme): string {
  const normalized = text.toLowerCase().trim();
  const semantic = theme === 'dark'
    ? { error: '#f87171', warning: '#fbbf24', warn: '#fbbf24', success: '#4ade80', ok: '#4ade80', info: '#60a5fa' }
    : { error: '#dc2626', warning: '#b45309', warn: '#b45309', success: '#15803d', ok: '#15803d', info: '#2563eb' };
  for (const [pattern, color] of Object.entries({ ...LOG_LEVEL_COLORS, ...semantic })) {
    if (normalized === pattern || normalized.includes(pattern)) return color;
  }
  const palette = themeColors(theme);
  return palette[hashString(text) % palette.length]!;
}

export function getSeriesColor(value: string, theme: Theme = 'light'): string {
  const palette = themeColors(theme);
  if (!value || value.trim() === '') return palette[0]!;
  const lv = value.toLowerCase();
  if (lv === 'null' || lv === 'undefined' || lv === 'unknown') return theme === 'dark' ? '#9ca3af' : '#4b5563';
  if (/^[2-5]\d{2}$/.test(value) || /^[2-5]xx$/i.test(value)) return getStatusCodeColor(value, theme);
  if (/^(p|q)\d+|median|max|min/i.test(value)) return getPercentileColor(value, theme);
  for (const pattern of Object.keys(LOG_LEVEL_COLORS)) {
    if (lv.includes(pattern)) return getLogLevelColor(value, theme);
  }
  return palette[hashString(value) % palette.length]!;
}

// Apply colors to all series in ECharts options based on series names
export function applySeriesColors(options: any, theme: Theme = 'light'): any {
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
      itemStyle: { color: getSeriesColor(name, theme) },
    }));
  } else {
    // Update existing series with colors if they don't have one
    options.series = options.series.map((s: any, i: number) => {
      const name = s.name || seriesNames[i] || `Series ${i + 1}`;
      if (!s.itemStyle?.color) {
        return { ...s, name, itemStyle: { ...s.itemStyle, color: getSeriesColor(name, theme) } };
      }
      return s;
    });
  }

  return options;
}
