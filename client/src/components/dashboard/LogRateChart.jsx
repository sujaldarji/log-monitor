import ReactECharts from 'echarts-for-react'
import ChartCard    from './ChartCard'
import { lineOption, C } from '../../lib/chartOptions'

// Phase 1.2: title will reflect timeRange once passed from Dashboard
export default function LogRateChart({ isDark, data, loading, error }) {
  return (
    <ChartCard isDark={isDark} title="Logs Per Minute — last 15m" loading={loading} error={error}>
      <ReactECharts
        option={lineOption(isDark, data, C.accent, 'logs')}
        style={{ height: 220 }}
        className="xl:!h-[280px] 2xl:!h-[320px]"
        notMerge
      />
    </ChartCard>
  )
}