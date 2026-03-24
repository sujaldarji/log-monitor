import ReactECharts from 'echarts-for-react'
import ChartCard    from './ChartCard'
import { severityBarOption } from '../../lib/chartOptions'

const LABELS = { '15m': 'last 15 min', '1h': 'last 1 hour', '6h': 'last 6 hours', '24h': 'last 24 hours' }

export default function SeverityDistributionChart({ isDark, data, loading, error, timeRange = '15m' }) {
  return (
    <ChartCard isDark={isDark} title={`Severity Distribution — ${LABELS[timeRange]}`} loading={loading} error={error}>
      <ReactECharts
        option={severityBarOption(isDark, data)}
        style={{ height: 220 }}
        className="xl:!h-[280px] 2xl:!h-[320px]"
        notMerge
      />
    </ChartCard>
  )
}