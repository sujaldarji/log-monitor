import ReactECharts from 'echarts-for-react'
import ChartCard    from './ChartCard'
import { lineOption, C } from '../../lib/chartOptions'

export default function ErrorChart({ isDark, data, loading, error }) {
  return (
    <ChartCard isDark={isDark} title="Error Events (4625) — last 15m" loading={loading} error={error}>
      <ReactECharts
        option={lineOption(isDark, data, C.error, 'errors')}
        style={{ height: 220 }}
        className="xl:!h-[280px] 2xl:!h-[320px]"
        notMerge
      />
    </ChartCard>
  )
}