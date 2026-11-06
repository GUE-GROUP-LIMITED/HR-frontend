import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface ActivityTrendChartProps {
  data: { date: string; incoming: number; resolved: number }[]
}

export const ActivityTrendChart: React.FC<ActivityTrendChartProps> = ({ data }) => {
  return (
    <div className="h-60 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
          <XAxis
            dataKey="date"
            stroke="#94A3B8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#94A3B8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${val}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0F172A',
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
              color: '#FFFFFF',
              fontSize: '12px',
            }}
            labelStyle={{ fontWeight: 700, color: '#E2E8F0' }}
          />
          <Area
            type="monotone"
            dataKey="incoming"
            stroke="#10B981"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorIncoming)"
            name="Incoming Messages"
          />
          <Area
            type="monotone"
            dataKey="resolved"
            stroke="#F59E0B"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorResolved)"
            name="Resolved & Closed"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
