import ReactECharts from 'echarts-for-react'
import ChartCard    from './ChartCard'
import { stackedHBarOption } from '../../lib/chartOptions'

const LABELS = { '15m': 'last 15 min', '1h': 'last 1 hour', '6h': 'last 6 hours', '24h': 'last 24 hours' }

export default function ChannelSeverityChart({ isDark, data, loading, error, timeRange = '15m' }) {
  return (
    <ChartCard isDark={isDark} title={`Channel × Severity — ${LABELS[timeRange]}`} loading={loading} error={error}>
      <ReactECharts
        option={stackedHBarOption(isDark, data)}
        style={{ height: 300 }}
        className="xl:!h-[340px] 2xl:!h-[380px]"
        notMerge
      />
    </ChartCard>
  )
}