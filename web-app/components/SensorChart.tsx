import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { SensorReading } from '../types';
import { useTheme } from '../context/ThemeContext';

interface SensorChartProps {
  data: SensorReading[];
  dataKey: 'temperature' | 'humidity' | 'heartRate';
  color: string;
  title: string;
  unit: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  isOnline?: boolean;
}

export const SensorChart: React.FC<SensorChartProps> = ({
  data,
  dataKey,
  color,
  title,
  unit,
  warningThreshold,
  criticalThreshold,
  isOnline = true
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="bg-white dark:bg-nexus-panel rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-lg">
      <h3 className="text-slate-500 dark:text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wider flex justify-between">
        <span>{title}</span>
        <span style={{ color }}>
          {isOnline && data.length > 0 ? Number(data[data.length - 1][dataKey]).toFixed(1) : '--'} {unit}
        </span>
      </h3>
      <div className="h-40 w-full min-w-0" style={{ minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} opacity={0.5} />
            <XAxis 
              dataKey="timestamp" 
              tick={false} 
              axisLine={{ stroke: isDark ? '#475569' : '#cbd5e1' }}
            />
            <YAxis 
              domain={['auto', 'auto']} 
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }}
              axisLine={{ stroke: isDark ? '#475569' : '#cbd5e1' }}
              width={30}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                borderColor: isDark ? '#334155' : '#e2e8f0', 
                color: isDark ? '#f8fafc' : '#1e293b' 
              }}
              itemStyle={{ color: color }}
              labelFormatter={() => ''}
            />
            {warningThreshold && (
              <ReferenceLine y={warningThreshold} stroke="#f59e0b" strokeDasharray="3 3" />
            )}
            {criticalThreshold && (
              <ReferenceLine y={criticalThreshold} stroke="#ef4444" strokeDasharray="3 3" />
            )}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};