import ReactECharts from 'echarts-for-react'
import ChartCard    from './ChartCard'
import { lineOption, C } from '../../lib/chartOptions'

const LABELS = { '15m': 'last 15 min', '1h': 'last 1 hour', '6h': 'last 6 hours', '24h': 'last 24 hours', '7d': 'last 7 days' }

export default function LogRateChart({ isDark, data, loading, error, timeRange = '15m' }) {
  return (
    <ChartCard isDark={isDark} title={`Logs Per Minute — ${LABELS[timeRange]}`} loading={loading} error={error}>
      <ReactECharts
        option={lineOption(isDark, data, C.accent, 'logs', timeRange)}
        style={{ height: 220 }}
        className="xl:!h-[280px] 2xl:!h-[320px]"
        notMerge
      />
    </ChartCard>
  )
}