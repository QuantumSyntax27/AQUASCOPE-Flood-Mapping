import shapely.geometry
from shapely import mapping

# Create a road line
road_line = shapely.geometry.LineString([(1, 1), (5, 5), (8, 8)])

# Create GeoJSON mapping
geojson = mapping(road_line)
print("GeoJSON:", geojson)

# Shape it back
road_feature = shapely.geometry.shape(geojson)
print("Road feature type:", road_feature.geom_type)
print("Road feature:", road_feature)

# Create flood mask
flood_geom = shapely.geometry.box(0, 0, 10, 10)
print("Flood geom intersects road:", road_feature.intersects(flood_geom))

# Check individual points
for pt in road_line.coords:
    print(f"  Point {pt} within flood: {flood_geom.contains(pt)}")