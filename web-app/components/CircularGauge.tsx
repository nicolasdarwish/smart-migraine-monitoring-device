import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface CircularGaugeProps {
  value: number; // 0 to 100
  label: string;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({ value, label }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // SVG Config
  const radius = 40;
  const stroke = 8;
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  // Only 180 degrees (half circle) so we map 0-100 to 0-PI
  
  // Calculate rotation for needle (-90deg is start, +90deg is end)
  // 0 -> -90, 50 -> 0, 100 -> +90
  const rotation = (normalizedValue / 100) * 180 - 90;

  // Determine color based on value
  const getColor = (v: number) => {
    if (v < 40) return '#10b981'; // Green
    if (v < 70) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const color = getColor(normalizedValue);
  const needleColor = isDark ? '#e2e8f0' : '#334155';
  const trackColor = isDark ? '#1e293b' : '#e2e8f0';

  return (
    <div className="flex flex-col items-center justify-center relative">
      <div className="relative w-48 h-28 overflow-hidden">
        <svg viewBox="0 0 100 55" className="w-full h-full">
          {/* Background Arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={trackColor}
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          
          {/* Colored Arc Segments (Optional: visually split zones) */}
          <path
            d="M 10 50 A 40 40 0 0 1 35 18"
            fill="none"
            stroke="#10b981"
            strokeWidth={stroke}
            strokeLinecap="round"
            opacity="0.2"
          />
           <path
            d="M 36 17 A 40 40 0 0 1 64 17"
            fill="none"
            stroke="#f59e0b"
            strokeWidth={stroke}
            strokeLinecap="round"
            opacity="0.2"
          />
           <path
            d="M 65 18 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#ef4444"
            strokeWidth={stroke}
            strokeLinecap="round"
            opacity="0.2"
          />

          {/* Needle */}
          <g transform={`translate(50, 50) rotate(${rotation})`}>
             {/* Needle Base */}
            <circle cx="0" cy="0" r="3" fill={needleColor} />
            {/* Needle Line */}
            <path d="M -1 0 L 0 -38 L 1 0 Z" fill={needleColor} />
          </g>
        </svg>
        
        {/* Value Text */}
        <div className="absolute bottom-0 left-0 w-full text-center -mb-1">
          <div className="text-2xl font-bold" style={{ color }}>{label}</div>
        </div>
      </div>
      <div className="flex justify-between w-full px-4 text-[10px] text-slate-500 font-bold uppercase mt-1">
        <span>Low</span>
        <span>Mod</span>
        <span>High</span>
      </div>
    </div>
  );
};