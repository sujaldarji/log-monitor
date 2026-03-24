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

// Severity colors — shared across all charts for consistency
export const SEVERITY_COLORS = {
  critical:    '#ef4444',
  error:       '#f97316',
  warning:     '#f59e0b',
  information: '#64748b',
}

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

  // ✅ helper for dynamic unit
  const formatSize = (gb) => {
    if (gb < 1) return `${(gb * 1024).toFixed(1)} MB`
    return `${gb.toFixed(2)} GB`
  }

  return {
    backgroundColor: 'transparent',
    grid: { top: 24, right: 24, bottom: 40, left: 60 },

    tooltip: {
      ...tooltip(isDark),
      formatter: params => {
        const p = params[0]
        const d = safe[p.dataIndex]

        return `<span style="font-family:monospace;font-size:12px">
          ${p.axisValue}<br/>
          <b>${formatSize(p.value)}</b><br/>
          ${d?.count ?? 0} docs
        </span>`
      }
    },

    xAxis: {
      type:      'category',
      data:      safe.map(d => d.date),
      axisLabel: {
        color: a.text,
        fontSize: 12,
        fontFamily: 'monospace',
        formatter: v => v.slice(5)
      },
      axisLine:  { lineStyle: { color: a.line } },
      splitLine: { show: false },
    },

    yAxis: {
      type:      'value',
      name:      'Size',
      nameTextStyle: { color: a.text, fontSize: 12 },
      axisLabel: {
        color: a.text,
        fontSize: 12,
        fontFamily: 'monospace',
        formatter: v => (v < 1 ? `${(v * 1024).toFixed(0)}MB` : `${v}GB`)
      },
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
        formatter:  p => formatSize(p.value), // ✅ dynamic
      }
    }]
  }
}



// ── Stacked horizontal bar — Channel × Severity ─────────────────────────────
// data shape: [{ channel, critical, error, warning }]
export const stackedHBarOption = (isDark, data) => {
  const safe     = Array.isArray(data) ? data : []
  const a        = ax(isDark)
  const channels = safe.map(d => d.channel)
  const severities = ['critical', 'error', 'warning']
 
  return {
    backgroundColor: 'transparent',
    grid:    { top: 16, right: 120, bottom: 16, left: 130 },
    tooltip: { ...tooltip(isDark), trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      data:      severities,
      right:     0,
      top:       'middle',
      orient:    'vertical',
      textStyle: { color: a.text, fontSize: 11, fontFamily: 'monospace' },
    },
    xAxis: {
      type:      'value',
      axisLabel: { color: a.text, fontSize: 12, fontFamily: 'monospace' },
      splitLine: { lineStyle: { color: a.line, type: 'dashed' } },
      axisLine:  { show: false },
    },
    yAxis: {
      type:      'category',
      data:      channels,
      axisLabel: {
        color:      a.text,
        fontSize:   11,
        fontFamily: 'monospace',
        width:      120,
        overflow:   'truncate',
        ellipsis:   '…',
      },
      axisLine:  { lineStyle: { color: a.line } },
      splitLine: { show: false },
    },
    series: severities.map(sev => ({
      name:        sev,
      type:        'bar',
      stack:       'total',              // stacked
      barMaxWidth: 24,
      data:        safe.map(d => d[sev] || 0),
      itemStyle: {
        color:        SEVERITY_COLORS[sev],
        borderRadius: sev === 'critical' ? [0, 3, 3, 0] : [0, 0, 0, 0],
      },
      label: {
        show:       false,               // too noisy on stacked
      },
    }))
  }
}

// ── Severity bar chart — replaces donut ─────────────────────────────────────
// data shape: [{ severity, count }] — critical/error/warning only
export const severityBarOption = (isDark, data) => {
  const safe  = Array.isArray(data) ? data : []
  const order = ['critical', 'error', 'warning']
  const sorted = order
    .map(s => safe.find(d => d.severity === s) || { severity: s, count: 0 })
  const a = ax(isDark)
 
  return {
    backgroundColor: 'transparent',
    grid: { top: 24, right: 16, bottom: 40, left: 52 },
    tooltip: {
      ...tooltip(isDark),
      trigger: 'axis',
      formatter: params => {
        const p = params[0]
        return `<span style="font-family:monospace;font-size:12px">
          ${p.axisValue}<br/><b>${p.value.toLocaleString()} events</b>
        </span>`
      }
    },
    xAxis: {
      type:      'category',
      data:      sorted.map(d => d.severity),
      axisLabel: { color: a.text, fontSize: 12, fontFamily: 'monospace' },
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
      type:        'bar',
      data:        sorted.map(d => ({
        value:     d.count,
        itemStyle: { color: SEVERITY_COLORS[d.severity], borderRadius: [3, 3, 0, 0] }
      })),
      barMaxWidth: 48,
      label: {
        show:       true,
        position:   'top',
        color:      a.text,
        fontSize:   11,
        fontFamily: 'monospace',
        formatter:  p => p.value.toLocaleString(),
      }
    }]
  }
}