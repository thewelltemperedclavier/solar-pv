import React from 'react';
import type { MetricType } from './Legend';
import { formatCurrency, formatPercent } from '../utils/format';

interface TooltipProps {
  zip: string;
  value: number | null;
  metric: MetricType;
  x: number;
  y: number;
}

export default function Tooltip({ zip, value, metric, x, y }: TooltipProps) {
  if (value === null) return null;
  
  const formatValue = () => {
    if (metric === 'equity_share') {
      return formatPercent(value);
    }
    return formatCurrency(value);
  };
  
  return (
    <div
      className="map-tooltip"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <div className="tooltip-zip">ZIP: {zip}</div>
      <div className="tooltip-value">{formatValue()}</div>
    </div>
  );
}
