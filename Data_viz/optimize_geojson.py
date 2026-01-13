#!/usr/bin/env python3
"""
Optimize GeoJSON: simplify geometries, rename properties, and compress
"""
import json
import sys
from pathlib import Path

def simplify_coordinates(coords, tolerance=0.0005, dim=2):
    """
    Douglas-Peucker simplification algorithm for coordinate reduction
    tolerance: in degrees, roughly 0.0005 ≈ 50m at equator
    """
    def perpendicular_distance(point, line_start, line_end):
        if line_start == line_end:
            return ((point[0] - line_start[0])**2 + (point[1] - line_start[1])**2)**0.5
        
        x0, y0 = point[0], point[1]
        x1, y1 = line_start[0], line_start[1]
        x2, y2 = line_end[0], line_end[1]
        
        denominator = ((x2 - x1)**2 + (y2 - y1)**2)**0.5
        if denominator == 0:
            return ((x0 - x1)**2 + (y0 - y1)**2)**0.5
        
        numerator = abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1)
        return numerator / denominator
    
    def rdp_simplify(points, tolerance):
        if len(points) < 3:
            return points
        
        max_distance = 0
        max_index = 0
        
        for i in range(1, len(points) - 1):
            distance = perpendicular_distance(points[i], points[0], points[-1])
            if distance > max_distance:
                max_distance = distance
                max_index = i
        
        if max_distance > tolerance:
            result1 = rdp_simplify(points[:max_index + 1], tolerance)
            result2 = rdp_simplify(points[max_index:], tolerance)
            return result1[:-1] + result2
        else:
            return [points[0], points[-1]]
    
    if isinstance(coords[0], (int, float)):
        # Single coordinate pair
        return coords
    elif isinstance(coords[0][0], (int, float)):
        # Linear ring
        return rdp_simplify(coords, tolerance)
    else:
        # Recursive case
        return [simplify_coordinates(ring, tolerance, dim) for ring in coords]

def optimize_feature(feature):
    """Simplify geometry and rename property"""
    if feature.get('geometry'):
        geom = feature['geometry']
        if geom.get('type') == 'Polygon' and geom.get('coordinates'):
            geom['coordinates'] = simplify_coordinates(geom['coordinates'], tolerance=0.001)
        elif geom.get('type') == 'MultiPolygon' and geom.get('coordinates'):
            geom['coordinates'] = simplify_coordinates(geom['coordinates'], tolerance=0.001)
    
    # Rename ZIP_CODE to ZCTA5CE10 to match expected property name
    props = feature.get('properties', {})
    if 'ZIP_CODE' in props:
        props['ZCTA5CE10'] = props['ZIP_CODE']
        # Keep some useful properties, remove others
        keep_props = {'ZCTA5CE10', 'PO_NAME', 'STATE'}
        feature['properties'] = {k: v for k, v in props.items() if k in keep_props}
    
    return feature

def main():
    input_file = '/Users/awassadaariyaphuttarat/Desktop/Data_viz/data/ca_zips_from_shp.geojson'
    output_file = '/Users/awassadaariyaphuttarat/Desktop/Data_viz/src/data/ca_zips.geojson'
    
    print(f"Reading {input_file}...")
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    print(f"Optimizing {len(data['features'])} features...")
    data['features'] = [optimize_feature(f) for f in data['features']]
    
    # Remove CRS to reduce file size
    if 'crs' in data:
        del data['crs']
    if 'name' in data:
        del data['name']
    
    print(f"Writing optimized GeoJSON to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    
    original_size = Path(input_file).stat().st_size / (1024*1024)
    new_size = Path(output_file).stat().st_size / (1024*1024)
    
    print(f"Done!")
    print(f"Original: {original_size:.1f} MB")
    print(f"Optimized: {new_size:.1f} MB")
    print(f"Reduction: {(1 - new_size/original_size)*100:.1f}%")

if __name__ == '__main__':
    main()
