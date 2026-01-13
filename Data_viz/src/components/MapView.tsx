import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type { FeatureCollection } from 'geojson';
import type { JoinedFeature } from '../utils/loadData';
import type { MetricType } from './Legend';
import { calculateBounds } from '../utils/loadData';
import Tooltip from './Tooltip';

interface MapViewProps {
  data: FeatureCollection;
  metric: MetricType;
  threshold: number;
  selectedZip: string | null;
  onZipClick: (zip: string) => void;
  onZipHover: (zip: string | null) => void;
}

const COLOR_SCALES = {
  total_subsidy: {
    colors: ['#f0f9e8', '#bae4bc', '#7bccc4', '#43a2ca', '#0868ac'],
    stops: [0, 0.25, 0.5, 0.75, 1],
  },
  low_income_subsidy: {
    colors: ['#f2f0f7', '#dadaeb', '#bcbddc', '#9e9ac8', '#756bb1'],
    stops: [0, 0.25, 0.5, 0.75, 1],
  },
  equity_share: {
    colors: ['#d73027', '#f46d43', '#fee08b', '#abdda4', '#3288bd'],
    stops: [0, 0.25, 0.5, 0.75, 1],
  },
};

export default function MapView({
  data,
  metric,
  threshold,
  selectedZip,
  onZipClick,
  onZipHover,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    zip: string;
    value: number | null;
    x: number;
    y: number;
  } | null>(null);
  
  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) {
      console.log('[MapView] Map container ref not available yet');
      return;
    }

    // Check if Mapbox token is set
    if (!mapboxgl.accessToken) {
      console.error('[MapView] Mapbox token is not set');
      setMapError('Mapbox token not configured. Please add VITE_MAPBOX_ACCESS_TOKEN to your .env file and restart the dev server.');
      return;
    }
    
    console.log('[MapView] Initializing map, container:', mapContainer.current);
    console.log('[MapView] Container size:', mapContainer.current.clientWidth, 'x', mapContainer.current.clientHeight);
    console.log('[MapView] Mapbox token present:', !!mapboxgl.accessToken);
    
    let loadTimeout: NodeJS.Timeout | null = null;
    let mapLoadFired = false;
    let mapInstance: mapboxgl.Map | null = null;
    
    try {
      // Clean up any previous map instance
      if (map.current) {
        try {
          map.current.remove();
        } catch (error) {
          console.warn('Error removing previous map:', error);
        }
      }

      console.log('[MapView] Creating Mapbox map instance');
      
      mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-119.4179, 36.7783], // California center
        zoom: 5,
      });
      
      map.current = mapInstance;
      
      const onMapLoad = () => {
        console.log('[MapView] Map loaded event fired');
        mapLoadFired = true;
        if (loadTimeout) clearTimeout(loadTimeout);
        setMapLoaded(true);
        // Ensure map renders correctly after load
        try {
          mapInstance?.resize();
        } catch (error) {
          console.warn('Error resizing map on load:', error);
        }
      };
      
      mapInstance.on('load', onMapLoad);
      
      // Mark as initialized immediately so we can add data layers
      console.log('[MapView] Map instance created, marking as initialized');
      setMapInitialized(true);
      
      // Fallback: consider map loaded after 3 seconds if load event doesn't fire
      loadTimeout = setTimeout(() => {
        if (!mapLoadFired) {
          console.log('[MapView] Load event timeout - forcing mapLoaded = true');
          setMapLoaded(true);
        }
      }, 3000);
      
      mapInstance.on('error', (e) => {
        console.error('[MapView] Mapbox error:', e);
        setMapError('Failed to load map. Check the Mapbox token and internet connection.');
      });
      
      // Handle window resize
      const handleResize = () => {
        try {
          mapInstance?.resize();
        } catch (error) {
          console.warn('Error resizing map:', error);
        }
      };
      window.addEventListener('resize', handleResize);
      
      return () => {
        if (loadTimeout) clearTimeout(loadTimeout);
        window.removeEventListener('resize', handleResize);
        if (mapInstance) {
          try {
            mapInstance.remove();
          } catch (error) {
            console.warn('Error removing map:', error);
          }
        }
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError(`Error initializing map: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);
  
  // Add data source and layers
  useEffect(() => {
    console.log('[MapView] Data effect - mapInitialized:', mapInitialized, 'mapLoaded:', mapLoaded, 'has data:', !!data?.features?.length);
    if (!map.current || !mapInitialized) {
      console.log('[MapView] Skipping data effect - map not ready');
      return;
    }
    
    try {
      const mapInstance = map.current;
      
      // Ensure we have valid data, even if empty
      const validData = data && data.features && Array.isArray(data.features) 
        ? data 
        : { type: 'FeatureCollection' as const, features: [] };
      
      console.log('[MapView] Adding/updating data source with', validData.features.length, 'features');
      
      // Add source
      if (mapInstance.getSource('zips')) {
        try {
          (mapInstance.getSource('zips') as mapboxgl.GeoJSONSource).setData(validData);
        } catch (error) {
          console.warn('Error updating source data:', error);
        }
      } else {
        try {
          mapInstance.addSource('zips', {
            type: 'geojson',
            data: validData,
          });
          console.log('[MapView] Source added');
          
          // Add fill layer
          mapInstance.addLayer({
            id: 'zips-fill',
            type: 'fill',
            source: 'zips',
            paint: {
              'fill-opacity': 0.7,
              'fill-color': '#cccccc', // Default gray color
            },
          });
          
          // Add outline layer
          mapInstance.addLayer({
            id: 'zips-outline',
            type: 'line',
            source: 'zips',
            paint: {
              'line-color': '#fff',
              'line-width': 0.5,
            },
          });
          
          // Add hover outline layer
          mapInstance.addLayer({
            id: 'zips-hover',
            type: 'line',
            source: 'zips',
            paint: {
              'line-color': '#333',
              'line-width': 2,
            },
            filter: ['==', 'ZCTA5CE10', ''],
          });
          
          // Add selected outline layer
          mapInstance.addLayer({
            id: 'zips-selected',
            type: 'line',
            source: 'zips',
            paint: {
              'line-color': '#d73027',
              'line-width': 3,
            },
            filter: ['==', 'ZCTA5CE10', ''],
          });
        } catch (error) {
          console.error('Error adding source/layers:', error);
        }
      }
      
      // Resize map to ensure proper rendering
      try {
        mapInstance.resize();
      } catch (error) {
        console.warn('Error resizing map:', error);
      }
      
      // Fit bounds only if we have features
      if (validData.features.length > 0) {
        try {
          const bounds = calculateBounds(validData);
          mapInstance.fitBounds(bounds, {
            padding: 50,
            duration: 1000,
          });
        } catch (error) {
          console.warn('Error fitting bounds:', error);
        }
      }
    } catch (error) {
      console.error('Error in data source/layer effect:', error);
    }
  }, [mapLoaded, data]);
  
  // Update choropleth colors based on metric
  useEffect(() => {
    if (!map.current || !mapLoaded || !data || !data.features) return;
    
    try {
      const mapInstance = map.current;
      const scale = COLOR_SCALES[metric];
      
      if (!scale) {
        console.warn('Unknown metric:', metric);
        return;
      }
      
      // Calculate min/max for the metric
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
        // No valid values, use default gray color
        try {
          mapInstance.setPaintProperty('zips-fill', 'fill-color', '#cccccc');
        } catch (error) {
          console.warn('Error setting default fill color:', error);
        }
        return;
      }
      
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      if (min === max || !isFinite(min) || !isFinite(max)) {
        // All values are the same or invalid, use single color
        try {
          mapInstance.setPaintProperty('zips-fill', 'fill-color', scale.colors[scale.colors.length - 1]);
        } catch (error) {
          console.warn('Error setting single fill color:', error);
        }
        return;
      }
      
      const range = max - min;
      
      // Create color stops
      const colorStops: [number, string][] = scale.stops.map((stop, i) => {
        const value = min + range * stop;
        return [value, scale.colors[i]];
      });
      
      // Update fill color
      try {
        mapInstance.setPaintProperty('zips-fill', 'fill-color', [
          'interpolate',
          ['linear'],
          ['get', metric],
          ...colorStops.flat(),
        ]);
      } catch (error) {
        console.warn('Error setting fill color:', error);
      }
    } catch (error) {
      console.error('Error in choropleth color effect:', error);
    }
  }, [mapLoaded, data, metric]);
  
  // Update opacity based on threshold
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    try {
      const mapInstance = map.current;
      
      // Ensure threshold is a valid number
      const validThreshold = typeof threshold === 'number' && !isNaN(threshold) ? threshold : 0;
      
      try {
        mapInstance.setPaintProperty('zips-fill', 'fill-opacity', [
          'case',
          ['<', ['get', metric], validThreshold],
          0.1, // Fade out below threshold
          0.7, // Normal opacity above threshold
        ]);
      } catch (error) {
        console.warn('Error setting fill opacity:', error);
      }
    } catch (error) {
      console.error('Error in opacity effect:', error);
    }
  }, [mapLoaded, metric, threshold]);
  
  // Update selected ZIP highlight
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    try {
      const mapInstance = map.current;
      
      if (selectedZip && typeof selectedZip === 'string') {
        try {
          mapInstance.setFilter('zips-selected', ['==', 'ZCTA5CE10', selectedZip]);
        } catch (error) {
          console.warn('Error setting selected filter:', error);
        }
      } else {
        try {
          mapInstance.setFilter('zips-selected', ['==', 'ZCTA5CE10', '']);
        } catch (error) {
          console.warn('Error clearing selected filter:', error);
        }
      }
    } catch (error) {
      console.error('Error in selected ZIP effect:', error);
    }
  }, [mapLoaded, selectedZip]);
  
  // Handle hover
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    try {
      const mapInstance = map.current;
      let hoveredZip: string | null = null;
      
      const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
        try {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0] as unknown as JoinedFeature;
            if (!feature || !feature.properties) return;
            
            const zip = feature.properties.ZCTA5CE10;
            if (!zip || typeof zip !== 'string') return;
            
            const value = feature.properties[metric];
            const numValue = value != null && !isNaN(Number(value)) ? Number(value) : null;
            
            if (hoveredZip !== zip) {
              hoveredZip = zip;
              
              try {
                mapInstance.setFilter('zips-hover', ['==', 'ZCTA5CE10', zip]);
              } catch (error) {
                console.warn('Error setting hover filter:', error);
              }
              
              onZipHover(zip);
              
              // Show tooltip
              try {
                const rect = mapInstance.getCanvas().getBoundingClientRect();
                setTooltip({
                  zip,
                  value: numValue,
                  x: e.point.x + rect.left,
                  y: e.point.y + rect.top - 10,
                });
              } catch (error) {
                console.warn('Error setting tooltip:', error);
              }
              
              // Change cursor
              try {
                mapInstance.getCanvas().style.cursor = 'pointer';
              } catch (error) {
                console.warn('Error setting cursor:', error);
              }
            }
          }
        } catch (error) {
          console.warn('Error in handleMouseMove:', error);
        }
      };
      
      const handleMouseLeave = () => {
        try {
          hoveredZip = null;
          mapInstance.setFilter('zips-hover', ['==', 'ZCTA5CE10', '']);
          onZipHover(null);
          setTooltip(null);
          mapInstance.getCanvas().style.cursor = '';
        } catch (error) {
          console.warn('Error in handleMouseLeave:', error);
        }
      };
      
      const handleClick = (e: mapboxgl.MapMouseEvent) => {
        try {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0] as unknown as JoinedFeature;
            if (!feature || !feature.properties) return;
            
            const zip = feature.properties.ZCTA5CE10;
            if (zip && typeof zip === 'string') {
              onZipClick(zip);
            }
          }
        } catch (error) {
          console.warn('Error in handleClick:', error);
        }
      };
      
      mapInstance.on('mousemove', 'zips-fill', handleMouseMove);
      mapInstance.on('mouseleave', 'zips-fill', handleMouseLeave);
      mapInstance.on('click', 'zips-fill', handleClick);
      
      return () => {
        try {
          mapInstance.off('mousemove', 'zips-fill', handleMouseMove);
          mapInstance.off('mouseleave', 'zips-fill', handleMouseLeave);
          mapInstance.off('click', 'zips-fill', handleClick);
        } catch (error) {
          console.warn('Error removing event listeners:', error);
        }
      };
    } catch (error) {
      console.error('Error in hover effect:', error);
    }
  }, [mapLoaded, metric, onZipClick, onZipHover]);
  
  if (mapError) {
    return (
      <div className="map-wrapper">
        <div className="map-error">
          <h3>⚠️ Map Configuration Error</h3>
          <p>{mapError}</p>
          <p style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
            The Mapbox token needs to be properly configured.
          </p>
          <code style={{ display: 'block', marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '4px', textAlign: 'left' }}>
            VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ...
          </code>
          <p style={{ fontSize: '0.85em', marginTop: '10px', color: '#666' }}>
            Get a free token at <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noreferrer">mapbox.com</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container" />
      {!mapInitialized && !mapError && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255,255,255,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          pointerEvents: 'none'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '30px',
              height: '30px',
              border: '4px solid #e0e0e0',
              borderTop: '4px solid #1976d2',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 10px'
            }} />
            <p style={{ color: '#666', fontSize: '14px' }}>Loading map...</p>
          </div>
        </div>
      )}
      {tooltip && (
        <Tooltip
          zip={tooltip.zip}
          value={tooltip.value}
          metric={metric}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
