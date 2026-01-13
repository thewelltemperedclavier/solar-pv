import React, { useMemo } from 'react';
import type { FeatureCollection } from 'geojson';
import type { JoinedFeature } from '../utils/loadData';
import type { MetricType } from './Legend';

interface HistogramProps {
  data: FeatureCollection;
  metric: MetricType;
  selectedZip: string | null;
  width?: number;
  height?: number;
}

export default function Histogram({
  data,
  metric,
  selectedZip,
  width = 300,
  height = 120,
}: HistogramProps) {
  const { bins, maxCount, selectedValue } = useMemo(() => {
    // Extract values for the selected metric
    const values = (data.features as JoinedFeature[])
      .map(f => {
        const val = f.properties[metric];
        return val != null && !isNaN(val) ? val : null;
      })
      .filter((v): v is number => v !== null);
    
    if (values.length === 0) {
      return { bins: [], maxCount: 0, selectedValue: null };
    }
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binCount = 20;
    const binWidth = (max - min) / binCount;
    
    // Create bins
    const bins = Array(binCount).fill(0).map((_, i) => ({
      start: min + i * binWidth,
      end: min + (i + 1) * binWidth,
      count: 0,
    }));
    
    // Count values in each bin
    values.forEach(val => {
      const binIndex = Math.min(
        Math.floor((val - min) / binWidth),
        binCount - 1
      );
      bins[binIndex].count++;
    });
    
    const maxCount = Math.max(...bins.map(b => b.count));
    
    // Find selected ZIP value
    let selectedValue: number | null = null;
    if (selectedZip) {
      const selectedFeature = (data.features as JoinedFeature[]).find(
        f => f.properties.ZCTA5CE10 === selectedZip
      );
      if (selectedFeature) {
        const val = selectedFeature.properties[metric];
        if (val != null && !isNaN(val)) {
          selectedValue = val;
        }
      }
    }
    
    return { bins, maxCount, selectedValue };
  }, [data, metric, selectedZip]);
  
  const padding = { top: 10, right: 10, bottom: 20, left: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  return (
    <div className="histogram">
      <div className="histogram-title">Distribution</div>
      <svg width={width} height={height} className="histogram-svg">
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {bins.map((bin, i) => {
            const barWidth = chartWidth / bins.length;
            const barHeight = maxCount > 0 ? (bin.count / maxCount) * chartHeight : 0;
            const x = (i / bins.length) * chartWidth;
            const y = chartHeight - barHeight;
            
            // Check if selected value falls in this bin
            const isSelected =
              selectedValue !== null &&
              selectedValue >= bin.start &&
              selectedValue < bin.end;
            
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={barWidth - 1}
                height={barHeight}
                fill={isSelected ? '#d73027' : '#43a2ca'}
                opacity={isSelected ? 0.8 : 0.6}
              />
            );
          })}
          
          {/* Selected value marker */}
          {selectedValue !== null && maxCount > 0 && bins.length > 0 && (() => {
            const min = bins[0].start;
            const max = bins[bins.length - 1].end;
            const x = ((selectedValue - min) / (max - min)) * chartWidth;
            return (
              <line
                x1={x}
                y1={0}
                x2={x}
                y2={chartHeight}
                stroke="#d73027"
                strokeWidth={2}
                strokeDasharray="4 2"
                opacity={0.8}
              />
            );
          })()}
        </g>
      </svg>
    </div>
  );
}
