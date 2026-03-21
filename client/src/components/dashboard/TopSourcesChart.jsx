import ReactECharts from 'echarts-for-react'
import ChartCard    from './ChartCard'
import { hBarOption } from '../../lib/chartOptions'

export default function TopSourcesChart({ isDark, data, loading, error }) {
  return (
    <ChartCard isDark={isDark} title="Top Log Sources — last 15m" loading={loading} error={error}>
      <ReactECharts
        option={hBarOption(isDark, data, 'hostname')}
        style={{ height: 260 }}
        className="xl:!h-[300px] 2xl:!h-[340px]"
        notMerge
      />
    </ChartCard>
  )
}