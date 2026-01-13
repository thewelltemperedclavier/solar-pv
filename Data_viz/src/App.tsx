import { useState, useEffect, useMemo } from 'react';
import type { FeatureCollection } from 'geojson';
import type { JoinedFeature } from './utils/loadData';
import type { MetricType } from './components/Legend';
import { loadJoinedData } from './utils/loadData';
import MapView from './components/MapView';
import SidePanel from './components/SidePanel';

function App() {
  const [data, setData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<MetricType>('total_subsidy');
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [hoveredZip, setHoveredZip] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0);
  
  // Load data on mount
  useEffect(() => {
    console.log('[App] Loading data...');
    loadJoinedData()
      .then((loadedData) => {
        console.log('[App] Data loaded successfully:', loadedData.features.length, 'features');
        setData(loadedData);
        setError(null);
      })
      .catch(err => {
        console.error('[App] Failed to load data:', err);
        // Don't set error state - render with empty data instead
        // This allows the map to still render
        setData({ type: 'FeatureCollection', features: [] });
        setError(null);
      })
      .finally(() => {
        console.log('[App] Data loading complete');
        setLoading(false);
      });
  }, []);
  
  // Calculate initial threshold based on metric
  const { min, max } = useMemo(() => {
    if (!data || !data.features || data.features.length === 0) {
      return { min: 0, max: 0 };
    }
    
    try {
      const values = (data.features as JoinedFeature[])
        .map(f => {
          if (!f || !f.properties) return null;
          const val = f.properties[metric];
          if (val == null || isNaN(val)) return null;
          const numVal = Number(val);
          return isNaN(numVal) ? null : numVal;
        })
        .filter((v): v is number => v !== null);
      
      if (values.length === 0) {
        return { min: 0, max: 0 };
      }
      
      // Guard against empty array (shouldn't happen due to check above, but extra safety)
      if (values.length === 1) {
        return { min: values[0], max: values[0] };
      }
      
      return {
        min: Math.min(...values),
        max: Math.max(...values),
      };
    } catch (error) {
      console.warn('Error calculating min/max:', error);
      return { min: 0, max: 0 };
    }
  }, [data, metric]);
  
  // Update threshold when metric changes
  useEffect(() => {
    setThreshold(min);
  }, [min]);
  
  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading data...</p>
      </div>
    );
  }
  
  // Always render the app, even if data is empty or there was an error
  // The map should still render with empty data
  const validData: FeatureCollection = data || { type: 'FeatureCollection', features: [] };
  
  return (
    <div className="app">
      {error && (
        <div className="app-error-banner" style={{ padding: '10px', background: '#ffebee', color: '#c62828' }}>
          <p>Warning: {error}</p>
        </div>
      )}
      <div className="app-map">
        <MapView
          data={validData}
          metric={metric}
          threshold={threshold}
          selectedZip={selectedZip}
          onZipClick={setSelectedZip}
          onZipHover={setHoveredZip}
        />
      </div>
      <div className="app-panel">
        <SidePanel
          data={validData}
          metric={metric}
          onMetricChange={setMetric}
          threshold={threshold}
          onThresholdChange={setThreshold}
          selectedZip={selectedZip}
        />
      </div>
    </div>
  );
}

export default App;
