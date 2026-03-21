import ReactECharts from 'echarts-for-react'
import ChartCard    from './ChartCard'
import { hBarOption } from '../../lib/chartOptions'

const LABELS = { '15m': 'last 15 min', '1h': 'last 1 hour', '6h': 'last 6 hours', '24h': 'last 24 hours' }

export default function TopChannelsChart({ isDark, data, loading, error, timeRange = '15m' }) {
  return (
    <ChartCard isDark={isDark} title={`Top 5 Channels — ${LABELS[timeRange]}`} loading={loading} error={error}>
      <ReactECharts
        option={hBarOption(isDark, data, 'channel')}
        style={{ height: 260 }}
        className="xl:!h-[300px] 2xl:!h-[340px]"
        notMerge
      />
    </ChartCard>
  )
}