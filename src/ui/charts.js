// ECharts option builders. Styling follows a validated, colour-blind-checked
// categorical palette; colour follows the entity, never its rank.
import * as echarts from 'echarts/core';
import { LineChart, BarChart, ScatterChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { fmt, fmtPeriod } from '../lib/format.js';

echarts.use([LineChart, BarChart, ScatterChart, GridComponent, TooltipComponent, LegendComponent, SVGRenderer]);
export { echarts };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function theme() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => cs.getPropertyValue(n).trim();
  return {
    text: v('--text'), text2: v('--text-2'), muted: v('--muted'), grid: v('--chart-grid'), axis: v('--chart-axis'),
    surface: v('--surface'), tooltipBg: v('--surface-2'), border: v('--border'),
    single: v('--series-single'),
    series: Array.from({ length: 8 }, (_, i) => v(`--series-${i + 1}`)),
    other: v('--series-other'),
    font: v('--font-sans') || 'system-ui, sans-serif',
  };
}

// Stable colour per entity: its slot in the dashboard's colour order.
export function colorAssigner(colorOrder, t) {
  const fixed = new Map();
  colorOrder.slice(0, 8).forEach((v, i) => fixed.set(v, t.series[i]));
  return (names) => {
    const used = new Set(names.map((n) => fixed.get(n)).filter(Boolean));
    const free = t.series.filter((c) => !used.has(c));
    return names.map((n) => fixed.get(n) || free.shift() || t.other);
  };
}

function base(t) {
  return {
    animationDuration: 500,
    animationDurationUpdate: 300,
    textStyle: { fontFamily: t.font, color: t.text2 },
    tooltip: {
      backgroundColor: t.tooltipBg, borderColor: t.border, borderWidth: 1, padding: [8, 10],
      textStyle: { color: t.text, fontFamily: t.font, fontSize: 12 },
      extraCssText: 'border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.18);',
      confine: true,
    },
  };
}

const axisCommon = (t) => ({
  axisLine: { lineStyle: { color: t.axis } },
  axisTick: { show: false },
  axisLabel: { color: t.muted, fontSize: 11, hideOverlap: true },
  splitLine: { lineStyle: { color: t.grid, type: 'solid' } },
});

export function lineOption({ periods, series, grain, format, currency, area = false, colors }) {
  const t = theme();
  const many = series.length > 1;
  const direct = series.length >= 2 && series.length <= 4;
  const longest = Math.max(...series.map((s) => String(s.name).length), 0);
  return {
    ...base(t),
    grid: { left: 8, right: direct ? Math.min(120, 16 + longest * 6.5) : 16, top: many ? 40 : 16, bottom: 8, containLabel: true },
    legend: many ? { top: 0, left: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: t.text2, fontSize: 12 }, type: 'scroll', pageIconColor: t.text2, pageTextStyle: { color: t.muted } } : undefined,
    tooltip: {
      ...base(t).tooltip, trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: t.axis } },
      formatter: (ps) => {
        const head = `<div style="font-weight:600;margin-bottom:4px">${esc(fmtPeriod(ps[0]?.axisValue, grain))}</div>`;
        const rows = [...ps].sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity)).map((p) =>
          `<div style="display:flex;gap:12px;justify-content:space-between"><span>${p.marker}${esc(p.seriesName)}</span><b>${esc(fmt(p.value, format, currency))}</b></div>`).join('');
        return head + rows;
      },
    },
    xAxis: { type: 'category', data: periods, boundaryGap: false, ...axisCommon(t), splitLine: { show: false }, axisLabel: { ...axisCommon(t).axisLabel, formatter: (v) => fmtPeriod(v, grain, true) } },
    yAxis: { type: 'value', scale: format === 'percent' || !area, ...axisCommon(t), axisLine: { show: false }, axisLabel: { ...axisCommon(t).axisLabel, formatter: (v) => fmt(v, format, currency) } },
    series: series.map((s, i) => ({
      type: 'line', name: s.name, data: s.data, smooth: 0.15, showSymbol: periods.length <= 2, symbolSize: 8,
      connectNulls: false,
      lineStyle: { width: 2, color: colors[i] }, itemStyle: { color: colors[i], borderColor: t.surface, borderWidth: 2 },
      emphasis: { focus: many ? 'series' : 'none', lineStyle: { width: 3 } },
      areaStyle: area && !many ? { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: hexA(colors[i], 0.28) }, { offset: 1, color: hexA(colors[i], 0) }]) } : undefined,
      endLabel: direct ? { show: true, formatter: '{a}', color: t.text2, fontSize: 11, distance: 6 } : undefined,
      labelLayout: direct ? { moveOverlap: 'shiftY' } : undefined,
    })),
  };
}

export function barOption({ labels, values, format, currency, color, highlightIndex = 0, colorsByLabel, unitSuffix }) {
  const t = theme();
  const longest = Math.max(...labels.map((l) => String(l).length), 0);
  return {
    ...base(t),
    grid: { left: 8, right: 56, top: 4, bottom: 4, containLabel: true },
    tooltip: {
      ...base(t).tooltip, trigger: 'item',
      formatter: (p) => `<div style="font-weight:600">${esc(p.name)}</div><div>${esc(fmt(p.value, format, currency))}${unitSuffix ? ` <span style="opacity:.7">${esc(unitSuffix)}</span>` : ''}</div>`,
    },
    xAxis: { type: 'value', ...axisCommon(t), axisLabel: { ...axisCommon(t).axisLabel, formatter: (v) => fmt(v, format, currency) } },
    yAxis: {
      type: 'category', data: labels, inverse: true, ...axisCommon(t), splitLine: { show: false },
      axisLabel: { ...axisCommon(t).axisLabel, color: t.text2, width: Math.min(150, longest * 7 + 4), overflow: 'truncate' },
    },
    series: [{
      type: 'bar', barMaxWidth: 20, barCategoryGap: '35%',
      data: values.map((v, i) => ({
        value: v,
        itemStyle: { color: colorsByLabel ? colorsByLabel[i] : color, borderRadius: [0, 4, 4, 0] },
        label: i === highlightIndex ? { show: true, position: 'right', formatter: () => fmt(v, format, currency), color: t.text, fontWeight: 600, fontSize: 12 } : { show: false },
      })),
      emphasis: { itemStyle: { opacity: 0.85 } },
    }],
  };
}

export function columnOption({ labels, values, format, currency, color, xLabelFormatter }) {
  const t = theme();
  return {
    ...base(t),
    grid: { left: 8, right: 16, top: 12, bottom: 8, containLabel: true },
    tooltip: { ...base(t).tooltip, trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: hexA(t.text, 0.05) } }, formatter: (ps) => `<div style="font-weight:600">${esc(xLabelFormatter ? xLabelFormatter(ps[0].name) : ps[0].name)}</div>${ps.map((p) => `<div>${p.marker}${esc(fmt(p.value, format, currency))}</div>`).join('')}` },
    xAxis: { type: 'category', data: labels, ...axisCommon(t), splitLine: { show: false }, axisLabel: { ...axisCommon(t).axisLabel, formatter: xLabelFormatter } },
    yAxis: { type: 'value', ...axisCommon(t), axisLine: { show: false }, axisLabel: { ...axisCommon(t).axisLabel, formatter: (v) => fmt(v, format, currency) } },
    series: [{ type: 'bar', data: values, barMaxWidth: 28, barCategoryGap: '20%', itemStyle: { color, borderRadius: [4, 4, 0, 0] } }],
  };
}

export function groupedBarOption({ labels, series, format, currency, colors }) {
  const t = theme();
  return {
    ...base(t),
    grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
    legend: { top: 0, left: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: t.text2 }, type: 'scroll' },
    tooltip: { ...base(t).tooltip, trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: hexA(t.text, 0.05) } }, valueFormatter: (v) => fmt(v, format, currency) },
    xAxis: { type: 'category', data: labels, ...axisCommon(t), splitLine: { show: false } },
    yAxis: { type: 'value', ...axisCommon(t), axisLine: { show: false }, axisLabel: { ...axisCommon(t).axisLabel, formatter: (v) => fmt(v, format, currency) } },
    series: series.map((s, i) => ({ type: 'bar', name: s.name, data: s.data, barMaxWidth: 18, barGap: '15%', itemStyle: { color: colors[i], borderRadius: [4, 4, 0, 0] } })),
  };
}

export function scatterOption({ points, mx, my, currency, colors, xLabel, yLabel }) {
  const t = theme();
  const labelAll = points.length <= 12;
  return {
    ...base(t),
    grid: { left: 8, right: 24, top: 16, bottom: 28, containLabel: true },
    tooltip: {
      ...base(t).tooltip, trigger: 'item',
      formatter: (p) => `<div style="font-weight:600">${esc(p.data.label)}${p.data.period ? ` <span style="opacity:.6">${esc(p.data.period)}</span>` : ''}</div><div>${esc(xLabel)}: <b>${esc(fmt(p.data.value[0], mx.format, currency))}</b></div><div>${esc(yLabel)}: <b>${esc(fmt(p.data.value[1], my.format, currency))}</b></div>`,
    },
    xAxis: { type: 'value', scale: true, name: xLabel, nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: t.muted, fontSize: 11 }, ...axisCommon(t), axisLabel: { ...axisCommon(t).axisLabel, formatter: (v) => fmt(v, mx.format, currency) } },
    yAxis: { type: 'value', scale: true, ...axisCommon(t), axisLine: { show: false }, axisLabel: { ...axisCommon(t).axisLabel, formatter: (v) => fmt(v, my.format, currency) } },
    series: [{
      type: 'scatter', symbolSize: 12,
      data: points.map((p, i) => ({ value: [p.x, p.y], label: p.label, period: p.period, itemStyle: { color: colors[i], borderColor: t.surface, borderWidth: 2 } })),
      label: { show: labelAll, formatter: (p) => p.data.label, position: 'right', color: t.text2, fontSize: 11 },
      labelLayout: { hideOverlap: true },
      emphasis: { scale: 1.4 },
    }],
  };
}

export function hexA(color, a) {
  const m = String(color).trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Inline SVG sparkline for KPI tiles (cheaper than a chart instance).
export function sparkline(values, color) {
  const v = values.filter((x) => x != null && Number.isFinite(x));
  if (v.length < 2) return '';
  const w = 120, hgt = 32, min = Math.min(...v), max = Math.max(...v), span = max - min || 1;
  const pts = v.map((x, i) => [(i / (v.length - 1)) * w, hgt - 3 - ((x - min) / span) * (hgt - 6)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 ${w} ${hgt}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.5" fill="${color}"/></svg>`;
}
