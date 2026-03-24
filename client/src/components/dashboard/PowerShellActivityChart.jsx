import ReactECharts from 'echarts-for-react'
import ChartCard    from './ChartCard'
import { ax, tooltip, C } from '../../lib/chartOptions'
import { format }         from 'date-fns'

const LABELS = {
  '15m': 'last 15 min',
  '1h':  'last 1 hour',
  '6h':  'last 6 hours',
  '24h': 'last 24 hours',
}

const psBarOption = (isDark, data, timeRange) => {
  const safe = Array.isArray(data) ? data : []
  const a    = ax(isDark)
  return {
    backgroundColor: 'transparent',
    grid: { top: 24, right: 16, bottom: 40, left: 52 },
    tooltip: {
      ...tooltip(isDark),
      formatter: params => {
        const p   = params[0]
        const fmt = timeRange === '24h' ? 'MM-dd HH:mm' : 'HH:mm'
        return `<span style="font-family:monospace;font-size:12px">
          ${format(new Date(p.axisValue), fmt)}<br/><b>${p.value} events</b>
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
        formatter:  v => format(new Date(v), 'HH:mm'),
      },
      axisLine:  { lineStyle: { color: a.line } },
      splitLine: { show: false },
    },
    yAxis: {
      type:      'value',
      min:       0,
      axisLabel: { color: a.text, fontSize: 12, fontFamily: 'monospace' },
      splitLine: { lineStyle: { color: a.line, type: 'dashed' } },
      axisLine:  { show: false },
    },
    series: [{
      type:        'bar',
      data:        safe.map(d => d.count),
      barMaxWidth: 12,
      itemStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: C.purple },
            { offset: 0.6, color: C.purple },
            { offset: 1, color: C.purple + 'dd' },
          ]
        },
        borderRadius: [2, 2, 0, 0],
      },
    }]
  }
}

export default function PowerShellActivityChart({ isDark, data, loading, error, timeRange = '15m' }) {
  return (
    <ChartCard
      isDark={isDark}
      title={`PowerShell Activity — ${LABELS[timeRange]}`}
      loading={loading}
      error={error}
    >
      <ReactECharts
        option={psBarOption(isDark, data, timeRange)}
        style={{ height: 220 }}
        className="xl:!h-[280px] 2xl:!h-[320px]"
        notMerge
      />
    </ChartCard>
  )
}