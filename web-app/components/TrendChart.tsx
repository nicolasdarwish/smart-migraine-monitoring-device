import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useTheme } from '../context/ThemeContext';

interface TrendData {
  day: string;
  value: number;
}

interface TrendChartProps {
  data: TrendData[];
  dataKey: string;
  color: string;
  title: string;
  unit?: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({ data, dataKey, color, title }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="bg-white dark:bg-nexus-panel rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col h-full">
      <h3 className="text-slate-500 dark:text-gray-400 text-xs font-bold mb-4 uppercase tracking-wider flex items-center gap-2">
        <i className="fas fa-chart-line"></i> {title}
      </h3>
      <div className="flex-1 min-h-[150px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} opacity={0.3} vertical={false} />
            <XAxis 
              dataKey="day" 
              tick={{ fill: isDark ? '#64748b' : '#94a3b8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              hide
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                borderColor: isDark ? '#334155' : '#e2e8f0', 
                borderRadius: '8px', 
                fontSize: '12px',
                color: isDark ? '#f8fafc' : '#1e293b'
              }}
              itemStyle={{ color: color }}
              cursor={{ stroke: isDark ? '#475569' : '#cbd5e1', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fillOpacity={1}
              fill={`url(#gradient-${dataKey})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};