import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface RiskGaugeProps {
  value: number; // 0 to 100
  label?: string;
  trend?: 'up' | 'down' | 'stable';
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ value, label, trend }) => {
  const { theme } = useTheme();
  
  // Clamping
  const score = Math.min(Math.max(value, 0), 100);
  
  // Colors
  let primaryColor = "#10b981"; // Green
  let statusText = "OPTIMAL";

  if (score > 70) {
      primaryColor = "#ef4444"; // Red
      statusText = "CRITICAL";
  } else if (score > 40) {
      primaryColor = "#f59e0b"; // Orange
      statusText = "CAUTION";
  }

  return (
    <div className="w-full px-1 py-2">
      <div className="flex justify-between items-end mb-2">
        <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Migraine Risk</span>
            <span className="text-xs font-bold" style={{ color: primaryColor }}>{statusText}</span>
        </div>
        <div className="text-right">
            <span className="text-xl font-bold font-mono leading-none" style={{ color: primaryColor }}>{Math.round(score)}%</span>
            {trend && (
                <div className="text-[10px] text-slate-400">
                    {trend === 'up' ? '↗ Rising' : trend === 'down' ? '↘ Falling' : '→ Stable'}
                </div>
            )}
        </div>
      </div>
      
      {/* Linear Bar Track */}
      <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
        {/* Animated Bar */}
        <div 
            className="h-full rounded-full transition-all duration-700 ease-out relative"
            style={{ width: `${score}%`, backgroundColor: primaryColor }}
        >
             {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full opacity-30"></div>
        </div>
      </div>

      {/* Ticks */}
      <div className="flex justify-between mt-1 px-1">
          <div className="w-px h-1 bg-slate-300 dark:bg-slate-600"></div>
          <div className="w-px h-1 bg-slate-300 dark:bg-slate-600"></div>
          <div className="w-px h-1 bg-slate-300 dark:bg-slate-600"></div>
          <div className="w-px h-1 bg-slate-300 dark:bg-slate-600"></div>
          <div className="w-px h-1 bg-slate-300 dark:bg-slate-600"></div>
      </div>
    </div>
  );
};