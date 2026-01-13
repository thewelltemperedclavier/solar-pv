import React from 'react';
import { formatCurrency } from '../utils/format';

interface DonutProps {
  totalSubsidy: number;
  lowIncomeSubsidy: number;
  width?: number;
  height?: number;
}

export default function Donut({
  totalSubsidy,
  lowIncomeSubsidy,
  width = 200,
  height = 200,
}: DonutProps) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 20;
  const innerRadius = radius * 0.6;
  
  const otherSubsidy = totalSubsidy - lowIncomeSubsidy;
  const total = totalSubsidy;
  
  const lowIncomeAngle = (lowIncomeSubsidy / total) * 360;
  const otherAngle = 360 - lowIncomeAngle;
  
  // Convert to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  // Calculate arc paths
  const getArcPath = (startAngle: number, endAngle: number, inner: boolean) => {
    const start = toRad(startAngle - 90);
    const end = toRad(endAngle - 90);
    const r = inner ? innerRadius : radius;
    
    const x1 = centerX + r * Math.cos(start);
    const y1 = centerY + r * Math.sin(start);
    const x2 = centerX + r * Math.cos(end);
    const y2 = centerY + r * Math.sin(end);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };
  
  return (
    <div className="donut">
      <div className="donut-title">Subsidy Breakdown</div>
      <svg width={width} height={height} className="donut-svg">
        {/* Low-income slice */}
        {lowIncomeAngle > 0 && (
          <path
            d={getArcPath(0, lowIncomeAngle, false)}
            fill="#756bb1"
            opacity={0.8}
          />
        )}
        
        {/* Other subsidy slice */}
        {otherAngle > 0 && (
          <path
            d={getArcPath(lowIncomeAngle, 360, false)}
            fill="#43a2ca"
            opacity={0.8}
          />
        )}
        
        {/* Inner circle (donut hole) */}
        <circle
          cx={centerX}
          cy={centerY}
          r={innerRadius}
          fill="white"
        />
        
        {/* Center text */}
        <text
          x={centerX}
          y={centerY - 5}
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill="#333"
        >
          {formatCurrency(totalSubsidy)}
        </text>
        <text
          x={centerX}
          y={centerY + 15}
          textAnchor="middle"
          fontSize="11"
          fill="#666"
        >
          Total
        </text>
      </svg>
      
      <div className="donut-legend">
        <div className="donut-legend-item">
          <div className="donut-legend-color" style={{ backgroundColor: '#756bb1' }} />
          <span>Low-Income: {formatCurrency(lowIncomeSubsidy)}</span>
        </div>
        <div className="donut-legend-item">
          <div className="donut-legend-color" style={{ backgroundColor: '#43a2ca' }} />
          <span>Other: {formatCurrency(otherSubsidy)}</span>
        </div>
      </div>
    </div>
  );
}
