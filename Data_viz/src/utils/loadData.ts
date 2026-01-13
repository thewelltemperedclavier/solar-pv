import Papa from 'papaparse';
import type { FeatureCollection, Feature } from 'geojson';

export interface SubsidyData {
  ZIP: string;
  total_subsidy: number;
  total_kW: number;
  project_count: number;
  low_income_subsidy: number;
  low_income_kW: number;
  low_projects: number;
  equity_share: number;
}

export interface JoinedFeature extends Feature {
  properties: {
    ZCTA5CE10: string;
    [key: string]: any;
  } & Partial<SubsidyData>;
}

/**
 * Normalize ZIP code to 5-digit string with leading zeros
 */
function normalizeZip(zip: string | number | null | undefined): string {
  if (zip == null) return '';
  return String(zip).padStart(5, '0');
}

/**
 * Load and parse CSV data
 */
export async function loadCSV(): Promise<SubsidyData[]> {
  try {
    console.log('Loading CSV from /data/california_solar_subsidy_by_zip.csv');
    const response = await fetch('/data/california_solar_subsidy_by_zip.csv');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse<SubsidyData>(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV parse errors (non-fatal):', results.errors);
          }
          
          // Normalize ZIP codes and filter out invalid rows
          const data = results.data
            .filter(row => row && row.ZIP != null)
            .map(row => ({
              ...row,
              ZIP: normalizeZip(row.ZIP),
              total_subsidy: Number(row.total_subsidy) || 0,
              total_kW: Number(row.total_kW) || 0,
              project_count: Number(row.project_count) || 0,
              low_income_subsidy: Number(row.low_income_subsidy) || 0,
              low_income_kW: Number(row.low_income_kW) || 0,
              low_projects: Number(row.low_projects) || 0,
              equity_share: Number(row.equity_share) || 0,
            }))
            .filter(row => row.ZIP.length === 5);
          
          console.log(`CSV loaded: ${data.length} rows`);
          resolve(data);
        },
        error: (error) => {
          console.error('CSV parse error:', error);
          reject(error);
        },
      });
    });
  } catch (error) {
    console.error('Failed to load CSV:', error);
    throw error;
  }
}

/**
 * Load GeoJSON data
 */
export async function loadGeoJSON(): Promise<FeatureCollection> {
  try {
    console.log('Loading GeoJSON from /data/ca_zips.geojson');
    const response = await fetch('/data/ca_zips.geojson');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch GeoJSON: ${response.status} ${response.statusText}`);
    }
    
    const geoJSON = await response.json();
    
    if (!geoJSON || !geoJSON.features || !Array.isArray(geoJSON.features)) {
      throw new Error('Invalid GeoJSON format: missing features array');
    }
    
    console.log(`GeoJSON loaded: ${geoJSON.features.length} features`);
    return geoJSON;
  } catch (error) {
    console.error('Failed to load GeoJSON:', error);
    throw error;
  }
}

/**
 * Join CSV data to GeoJSON features
 */
export async function loadJoinedData(): Promise<FeatureCollection> {
  let csvData: SubsidyData[] = [];
  let geoJSON: FeatureCollection;
  
  // Try to load both, but continue even if CSV fails
  try {
    csvData = await loadCSV();
  } catch (error) {
    console.warn('CSV loading failed, continuing with GeoJSON only:', error);
    csvData = [];
  }
  
  try {
    geoJSON = await loadGeoJSON();
  } catch (error) {
    console.error('GeoJSON loading failed, cannot continue:', error);
    throw error;
  }
  
  // Create lookup map
  const lookup = new Map<string, SubsidyData>();
  csvData.forEach(row => {
    if (row && row.ZIP) {
      lookup.set(normalizeZip(row.ZIP), row);
    }
  });
  
  let joinCount = 0;
  
  // Join data to features, skipping invalid features
  const joinedFeatures: JoinedFeature[] = geoJSON.features
    .filter(feature => {
      // Skip features without properties or ZCTA5CE10
      return feature && feature.properties && feature.properties.ZCTA5CE10 != null;
    })
    .map(feature => {
      const zipCode = feature.properties?.ZCTA5CE10;
      if (!zipCode) {
        // Shouldn't happen due to filter, but double-check
        return null;
      }
      
      const zip = normalizeZip(zipCode);
      const csvRow = lookup.get(zip);
      
      if (csvRow) {
        joinCount++;
        return {
          ...feature,
          properties: {
            ...(feature.properties || {}),
            ZCTA5CE10: zipCode,
            total_subsidy: Number(csvRow.total_subsidy) || 0,
            total_kW: Number(csvRow.total_kW) || 0,
            project_count: Number(csvRow.project_count) || 0,
            low_income_subsidy: Number(csvRow.low_income_subsidy) || 0,
            low_income_kW: Number(csvRow.low_income_kW) || 0,
            low_projects: Number(csvRow.low_projects) || 0,
            equity_share: Number(csvRow.equity_share) || 0,
          },
        } as JoinedFeature;
      } else {
        // No data for this ZIP - set metrics to 0
        return {
          ...feature,
          properties: {
            ...(feature.properties || {}),
            ZCTA5CE10: zipCode,
            total_subsidy: 0,
            total_kW: 0,
            project_count: 0,
            low_income_subsidy: 0,
            low_income_kW: 0,
            low_projects: 0,
            equity_share: 0,
          },
        } as JoinedFeature;
      }
    })
    .filter((f): f is JoinedFeature => f !== null);
  
  console.log(`Data joined: ${joinCount} ZIPs matched out of ${joinedFeatures.length} features`);
  
  return {
    type: 'FeatureCollection',
    features: joinedFeatures,
  };
}

/**
 * Calculate bounds for California ZIP codes
 */
export function calculateBounds(geoJSON: FeatureCollection): [[number, number], [number, number]] {
  if (!geoJSON || !geoJSON.features || geoJSON.features.length === 0) {
    // Default to California bounds if no features
    return [[-124.5, 32.5], [-114.0, 42.0]];
  }
  
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  
  geoJSON.features.forEach(feature => {
    if (!feature || !feature.geometry) return;
    
    try {
      if (feature.geometry.type === 'Polygon' && feature.geometry.coordinates) {
        const coords = feature.geometry.coordinates[0];
        if (Array.isArray(coords)) {
          coords.forEach((coord: any) => {
            if (Array.isArray(coord) && coord.length >= 2) {
              const [lng, lat] = coord;
              if (typeof lng === 'number' && typeof lat === 'number' && !isNaN(lng) && !isNaN(lat)) {
                minLng = Math.min(minLng, lng);
                minLat = Math.min(minLat, lat);
                maxLng = Math.max(maxLng, lng);
                maxLat = Math.max(maxLat, lat);
              }
            }
          });
        }
      } else if (feature.geometry.type === 'MultiPolygon' && feature.geometry.coordinates) {
        feature.geometry.coordinates.forEach(polygon => {
          if (Array.isArray(polygon) && polygon[0]) {
            const coords = polygon[0];
            if (Array.isArray(coords)) {
              coords.forEach((coord: any) => {
                if (Array.isArray(coord) && coord.length >= 2) {
                  const [lng, lat] = coord;
                  if (typeof lng === 'number' && typeof lat === 'number' && !isNaN(lng) && !isNaN(lat)) {
                    minLng = Math.min(minLng, lng);
                    minLat = Math.min(minLat, lat);
                    maxLng = Math.max(maxLng, lng);
                    maxLat = Math.max(maxLat, lat);
                  }
                }
              });
            }
          }
        });
      }
    } catch (error) {
      console.warn('Error processing feature geometry:', error);
    }
  });
  
  // If no valid coordinates found, return default California bounds
  if (minLng === Infinity || minLat === Infinity || maxLng === -Infinity || maxLat === -Infinity) {
    return [[-124.5, 32.5], [-114.0, 42.0]];
  }
  
  return [[minLng, minLat], [maxLng, maxLat]];
}
