import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TestEntry } from '../types'

interface TrendChartProps {
  tests: TestEntry[]
  dataKey: keyof TestEntry
  label: string
  color: string
}

export default function TrendChart({ tests, dataKey, label, color }: TrendChartProps) {
  const points = tests
    .filter((t) => t[dataKey] !== undefined)
    .map((t) => ({
      date: new Date(t.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: t[dataKey] as number,
    }))

  if (points.length < 2) return null

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
      <h3 className="font-medium mb-2">{label}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis fontSize={12} domain={['auto', 'auto']} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
