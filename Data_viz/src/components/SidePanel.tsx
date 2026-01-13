import { useMemo } from 'react';
import type { FeatureCollection } from 'geojson';
import type { JoinedFeature } from '../utils/loadData';
import type { MetricType } from './Legend';
import { formatCurrency, formatPercent, formatNumber } from '../utils/format';
import Legend from './Legend';
import Histogram from './Histogram';
import Donut from './Donut';

interface SidePanelProps {
  data: FeatureCollection;
  metric: MetricType;
  onMetricChange: (metric: MetricType) => void;
  threshold: number;
  onThresholdChange: (threshold: number) => void;
  selectedZip: string | null;
}

export default function SidePanel({
  data,
  metric,
  onMetricChange,
  threshold,
  onThresholdChange,
  selectedZip,
}: SidePanelProps) {
  const selectedData = useMemo(() => {
    if (!selectedZip) return null;
    return (data.features as JoinedFeature[]).find(
      f => f.properties.ZCTA5CE10 === selectedZip
    );
  }, [data, selectedZip]);
  
  const { min, max } = useMemo(() => {
    const values = (data.features as JoinedFeature[])
      .map(f => {
        const val = f.properties[metric];
        return val != null && !isNaN(val) ? val : null;
      })
      .filter((v): v is number => v !== null);
    
    if (values.length === 0) return { min: 0, max: 0 };
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [data, metric]);
  
  const formatThreshold = (value: number) => {
    if (metric === 'equity_share') {
      return formatPercent(value);
    }
    return formatCurrency(value);
  };
  
  return (
    <div className="side-panel">
      <div className="panel-header">
        <h1 className="panel-title">Follow the Subsidy</h1>
        <p className="panel-description">
          An interactive map exploring how California solar incentives are distributed across ZIP codes, with a focus on equity and low-income access.
        </p>
      </div>
      
      <div className="panel-section">
        <div className="section-title">Metric</div>
        <div className="metric-tabs">
          <button
            className={`metric-tab ${metric === 'total_subsidy' ? 'active' : ''}`}
            onClick={() => onMetricChange('total_subsidy')}
          >
            Total Subsidy
          </button>
          <button
            className={`metric-tab ${metric === 'low_income_subsidy' ? 'active' : ''}`}
            onClick={() => onMetricChange('low_income_subsidy')}
          >
            Low-Income
          </button>
          <button
            className={`metric-tab ${metric === 'equity_share' ? 'active' : ''}`}
            onClick={() => onMetricChange('equity_share')}
          >
            Equity Share
          </button>
        </div>
      </div>
      
      <div className="panel-section">
        <div className="section-title">
          Filter: {formatThreshold(threshold)}
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={threshold}
          onChange={(e) => onThresholdChange(Number(e.target.value))}
          className="threshold-slider"
          step={metric === 'equity_share' ? 0.01 : (max - min) / 1000}
        />
        <div className="slider-labels">
          <span>{formatThreshold(min)}</span>
          <span>{formatThreshold(max)}</span>
        </div>
      </div>
      
      <div className="panel-section">
        <Legend metric={metric} min={min} max={max} />
      </div>
      
      {selectedData && (
        <div className="panel-section">
          <div className="section-title">Selected ZIP: {selectedData.properties.ZCTA5CE10}</div>
          <div className="zip-stats">
            <div className="stat-row">
              <span className="stat-label">Total Subsidy:</span>
              <span className="stat-value">{formatCurrency(selectedData.properties.total_subsidy)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Low-Income Subsidy:</span>
              <span className="stat-value">{formatCurrency(selectedData.properties.low_income_subsidy)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Equity Share:</span>
              <span className="stat-value">{formatPercent(selectedData.properties.equity_share)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Project Count:</span>
              <span className="stat-value">{selectedData.properties.project_count || 0}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Total kW:</span>
              <span className="stat-value">{formatNumber(selectedData.properties.total_kW || 0)} kW</span>
            </div>
          </div>
        </div>
      )}
      
      {selectedData && (
        <div className="panel-section">
          <Donut
            totalSubsidy={selectedData.properties.total_subsidy || 0}
            lowIncomeSubsidy={selectedData.properties.low_income_subsidy || 0}
          />
        </div>
      )}
      
      <div className="panel-section">
        <Histogram
          data={data}
          metric={metric}
          selectedZip={selectedZip}
        />
      </div>
    </div>
  );
}
