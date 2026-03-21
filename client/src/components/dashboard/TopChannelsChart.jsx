import ReactECharts from 'echarts-for-react'
import ChartCard    from './ChartCard'
import { hBarOption } from '../../lib/chartOptions'

export default function TopChannelsChart({ isDark, data, loading, error }) {
  return (
    <ChartCard isDark={isDark} title="Top 5 Channels — last 15m" loading={loading} error={error}>
      <ReactECharts
        option={hBarOption(isDark, data, 'channel')}
        style={{ height: 260 }}
        className="xl:!h-[300px] 2xl:!h-[340px]"
        notMerge
      />
    </ChartCard>
  )
}