import ReactECharts from 'echarts-for-react'
import ChartCard    from './ChartCard'
import { vBarOption } from '../../lib/chartOptions'

// Intentionally NOT connected to timeRange — always shows last 10 days
// This is a storage trends widget, not a log volume widget
export default function IndexSizeChart({ isDark, data, loading, error }) {
  return (
    <ChartCard isDark={isDark} title="Index Size Per Day — last 10 days" loading={loading} error={error}>
      <ReactECharts
        option={vBarOption(isDark, data)}
        style={{ height: 240 }}
        className="xl:!h-[300px] 2xl:!h-[340px]"
        notMerge
      />
    </ChartCard>
  )
}