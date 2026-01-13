import React from 'react';

export type MetricType = 'total_subsidy' | 'low_income_subsidy' | 'equity_share';

interface LegendProps {
  metric: MetricType;
  min: number;
  max: number;
}

const COLOR_SCALES = {
  total_subsidy: {
    name: 'Total Subsidy',
    colors: ['#f0f9e8', '#bae4bc', '#7bccc4', '#43a2ca', '#0868ac'],
  },
  low_income_subsidy: {
    name: 'Low-Income Subsidy',
    colors: ['#f2f0f7', '#dadaeb', '#bcbddc', '#9e9ac8', '#756bb1'],
  },
  equity_share: {
    name: 'Equity Share',
    colors: ['#d73027', '#f46d43', '#fee08b', '#abdda4', '#3288bd'],
  },
};

export default function Legend({ metric, min, max }: LegendProps) {
  const scale = COLOR_SCALES[metric];
  const colors = scale.colors;
  
  // Create gradient stops
  const stops = colors.map((color, i) => ({
    color,
    value: min + (max - min) * (i / (colors.length - 1)),
  }));
  
  return (
    <div className="legend">
      <div className="legend-title">{scale.name}</div>
      <div className="legend-gradient">
        {colors.map((color, i) => (
          <div
            key={i}
            className="legend-color"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="legend-labels">
        <span>{formatValue(min, metric)}</span>
        <span>{formatValue(max, metric)}</span>
      </div>
    </div>
  );
}

function formatValue(value: number, metric: MetricType): string {
  if (metric === 'equity_share') {
    return `${(value * 100).toFixed(0)}%`;
  }
  return `$${formatNumber(value)}`;
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toFixed(0);
}
