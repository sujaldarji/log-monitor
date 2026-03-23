import { format } from 'date-fns'

// ── Colors ──────────────────────────────────────────────────────────────────
export const C = {
  accent:  '#3b82f6',
  error:   '#ef4444',
  emerald: '#10b981',
  amber:   '#f59e0b',
  purple:  '#a855f7',
}

// ── Axis style per theme ────────────────────────────────────────────────────
export const ax = (isDark) => ({
  text: isDark ? '#6b8090' : '#64748b',
  line: isDark ? '#182438' : '#e2e8f0',
})

// ── Shared tooltip style ────────────────────────────────────────────────────
export const tooltip = (isDark) => ({
  trigger: 'axis',
  backgroundColor: isDark ? '#0d1520' : '#fff',
  borderColor:     isDark ? '#182438' : '#e2e8f0',
  textStyle: { color: isDark ? '#eef2f9' : '#1e293b', fontSize: 13, fontFamily: 'monospace' },
})

// ── Step 1.4: bucket interval per range ────────────────────────────────────
// Keeps line charts clean — avoids noisy 1m spikes on a 24h view
const BUCKET = {
  '15m': '1m',
  '1h':  '5m',
  '6h':  '15m',
  '24h': '1h',
}

// ── Line chart ──────────────────────────────────────────────────────────────
export const lineOption = (isDark, data, color, label, timeRange = '15m') => {
  const safe     = Array.isArray(data) ? data : []
  const a        = ax(isDark)
  const interval = BUCKET[timeRange] || '1m'
  return {
    backgroundColor: 'transparent',
    grid: { top: 24, right: 16, bottom: 40, left: 52 },
    tooltip: {
      ...tooltip(isDark),
      formatter: (params) => {
        const p   = params[0]
        const fmt = timeRange === '24h' ? 'MM-dd HH:mm' : 'HH:mm'
        return `<span style="font-family:monospace;font-size:12px">
          ${format(new Date(p.axisValue), fmt)}<br/><b>${p.value} ${label}</b>
        </span>`
      }
    },
    xAxis: {
      type:      'category',
      data:      safe.map(d => d.time),
      axisLabel: {
        color:      a.text,
        fontSize:   12,
        fontFamily: 'monospace',
        formatter:  v => format(new Date(v), timeRange === '24h' ? 'HH:mm' : 'HH:mm'),
      },
      axisLine:  { lineStyle: { color: a.line } },
      splitLine: { show: false },
    },
    yAxis: {
      type:      'value',
      axisLabel: { color: a.text, fontSize: 12, fontFamily: 'monospace' },
      splitLine: { lineStyle: { color: a.line, type: 'dashed' } },
      axisLine:  { show: false },
    },
    series: [{
      type:      'line',
      data:      safe.map(d => d.count),
      smooth:    true,
      symbol:    'none',
      lineStyle: { color, width: 2 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: color + '35' },
            { offset: 1, color: color + '00' },
          ]
        }
      }
    }]
  }
}

// ── Horizontal bar chart ────────────────────────────────────────────────────
export const hBarOption = (isDark, data, keyField) => {
  const safe   = Array.isArray(data) ? data : []
  const sorted = [...safe].sort((a, b) => a.count - b.count)
  const a      = ax(isDark)
  return {
    backgroundColor: 'transparent',
    grid: { top: 16, right: 80, bottom: 16, left: 100 },
    tooltip: tooltip(isDark),
    xAxis: {
      type:      'value',
      axisLabel: { color: a.text, fontSize: 12, fontFamily: 'monospace' },
      splitLine: { lineStyle: { color: a.line, type: 'dashed' } },
      axisLine:  { show: false },
    },
    yAxis: {
      type:      'category',
      data:      sorted.map(d => String(d[keyField])),
      axisLabel: {
        color:      a.text,
        fontSize:   12,
        fontFamily: 'monospace',
        width:      90,
        overflow:   'truncate',
        ellipsis:   '…',
      },
      axisLine:  { lineStyle: { color: a.line } },
      splitLine: { show: false },
    },
    series: [{
      type:        'bar',
      data:        sorted.map(d => d.count),
      barMaxWidth: 24,
      itemStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: C.accent },
            { offset: 1, color: '#1d4ed8' },
          ]
        },
        borderRadius: [0, 3, 3, 0],
      },
      label: {
        show:       true,
        position:   'right',
        color:      a.text,
        fontSize:   12,
        fontFamily: 'monospace',
        formatter:  p => p.value.toLocaleString(),
      }
    }]
  }
}

// ── Vertical bar chart ──────────────────────────────────────────────────────
export const vBarOption = (isDark, data) => {
  const safe = Array.isArray(data) ? data : []
  const a    = ax(isDark)
  return {
    backgroundColor: 'transparent',
    grid: { top: 24, right: 24, bottom: 40, left: 60 },
    tooltip: {
      ...tooltip(isDark),
      formatter: params => {
        const p = params[0]
        return `<span style="font-family:monospace;font-size:12px">
          ${p.axisValue}<br/><b>${p.value} GB</b>
        </span>`
      }
    },
    xAxis: {
      type:      'category',
      data:      safe.map(d => d.date),
      axisLabel: { color: a.text, fontSize: 12, fontFamily: 'monospace', formatter: v => v.slice(5) },
      axisLine:  { lineStyle: { color: a.line } },
      splitLine: { show: false },
    },
    yAxis: {
      type:      'value',
      name:      'GB',
      nameTextStyle: { color: a.text, fontSize: 12 },
      axisLabel: { color: a.text, fontSize: 12, fontFamily: 'monospace', formatter: v => `${v}GB` },
      splitLine: { lineStyle: { color: a.line, type: 'dashed' } },
      axisLine:  { show: false },
    },
    series: [{
      type:        'bar',
      data:        safe.map(d => d.sizeGB),
      barMaxWidth: 48,
      itemStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: C.emerald },
            { offset: 1, color: C.emerald + 'cc' },
          ]
        },
        borderRadius: [3, 3, 0, 0],
      },
      label: {
        show:       true,
        position:   'top',
        color:      a.text,
        fontSize:   11,
        fontFamily: 'monospace',
        formatter:  p => `${p.value}GB`,
      }
    }]
  }
}