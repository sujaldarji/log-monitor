import ReactECharts from 'echarts-for-react'
import ChartCard    from './ChartCard'
import { hBarOption } from '../../lib/chartOptions'

const LABELS = { '15m': 'last 15 min', '1h': 'last 1 hour', '6h': 'last 6 hours', '24h': 'last 24 hours', '7d': 'last 7 days' }

export default function TopEventIdsChart({ isDark, data, loading, error, timeRange = '15m' }) {
  return (
    <ChartCard isDark={isDark} title={`Top Event IDs — ${LABELS[timeRange]}`} loading={loading} error={error}>
      <ReactECharts
        option={hBarOption(isDark, data, 'event_id')}
        style={{ height: 300 }}
        className="xl:!h-[340px] 2xl:!h-[380px]"
        notMerge
      />
    </ChartCard>
  )
}