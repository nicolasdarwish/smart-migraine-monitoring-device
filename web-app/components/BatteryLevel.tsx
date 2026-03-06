import React from 'react';

interface BatteryLevelProps {
  level: number | undefined; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
}

export const BatteryLevel: React.FC<BatteryLevelProps> = ({ 
  level, 
  size = 'md',
  showPercentage = true 
}) => {
  // Handle undefined or invalid levels - show 100% when no connection
  const batteryLevel = level !== undefined ? Math.max(0, Math.min(100, level)) : 100;
  
  // Determine battery status
  const getBatteryStatus = () => {
    if (batteryLevel >= 60) return 'high';
    if (batteryLevel >= 20) return 'medium';
    return 'low';
  };

  const status = getBatteryStatus();
  
  // Size configurations
  const sizeConfig = {
    sm: { width: 'w-12', height: 'h-6', text: 'text-xs', icon: 'text-sm' },
    md: { width: 'w-16', height: 'h-8', text: 'text-sm', icon: 'text-base' },
    lg: { width: 'w-20', height: 'h-10', text: 'text-base', icon: 'text-lg' }
  };

  const config = sizeConfig[size];

  // Color based on battery level
  const getBatteryColor = () => {
    if (status === 'high') return 'bg-green-500 dark:bg-green-400';
    if (status === 'medium') return 'bg-yellow-500 dark:bg-yellow-400';
    return 'bg-red-500 dark:bg-red-400';
  };

  const getBorderColor = () => {
    if (status === 'high') return 'border-green-500 dark:border-green-400';
    if (status === 'medium') return 'border-yellow-500 dark:border-yellow-400';
    return 'border-red-500 dark:border-red-400';
  };

  const getTextColor = () => {
    if (status === 'high') return 'text-green-600 dark:text-green-400';
    if (status === 'medium') return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="flex items-center gap-2">
      {/* Battery Icon */}
      <div className={`relative ${config.width} ${config.height} flex items-center justify-center`}>
        {/* Battery Outline */}
        <div className={`absolute inset-0 rounded border-2 ${getBorderColor()} bg-slate-100 dark:bg-slate-800`}>
          {/* Battery Fill */}
        <div 
          className={`absolute bottom-0 left-0 rounded-sm ${getBatteryColor()} transition-all duration-500 ease-out`}
          style={{ 
            width: `${batteryLevel}%`,
            height: 'calc(100% - 4px)',
            margin: '2px'
          }}
        />
        </div>
        
        {/* Battery Terminal */}
        <div className={`absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 rounded-r ${getBorderColor()} bg-slate-100 dark:bg-slate-800`} />
      </div>

      {/* Percentage Text */}
      {showPercentage && (
        <div className={`${config.text} font-bold ${getTextColor()}`}>
          {Math.round(batteryLevel)}%
        </div>
      )}
    </div>
  );
};

