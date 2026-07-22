/**
 * Utility functions for GeoJSON processing
 */

interface GeoJSONPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

interface GeoJSONLineString {
  type: "LineString";
  coordinates: [number, number][];
}

interface GeoJSONFeature {
  type: "Feature";
  geometry: GeoJSONLineString | GeoJSONPoint;
  properties?: Record<string, unknown>;
}

interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

/**
 * Calculate the centroid (center point) of a GeoJSON geometry
 */
export function calculateCentroid(geojson: GeoJSONFeature | GeoJSONFeatureCollection): GeoJSONPoint {
  let allCoordinates: [number, number][] = [];

  if (geojson.type === "Feature") {
    if (geojson.geometry.type === "LineString") {
      allCoordinates = geojson.geometry.coordinates;
    } else if (geojson.geometry.type === "Point") {
      return geojson.geometry;
    }
  } else if (geojson.type === "FeatureCollection") {
    for (const feature of geojson.features) {
      if (feature.geometry.type === "LineString") {
        allCoordinates.push(...feature.geometry.coordinates);
      } else if (feature.geometry.type === "Point") {
        allCoordinates.push(feature.geometry.coordinates);
      }
    }
  }

  if (allCoordinates.length === 0) {
    return { type: "Point", coordinates: [0, 0] };
  }

  // Calculate average longitude and latitude
  const avgLon = allCoordinates.reduce((sum, coord) => sum + coord[0], 0) / allCoordinates.length;
  const avgLat = allCoordinates.reduce((sum, coord) => sum + coord[1], 0) / allCoordinates.length;

  return {
    type: "Point",
    coordinates: [avgLon, avgLat],
  };
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get bounding box of a GeoJSON geometry
 */
export function getBoundingBox(
  geojson: GeoJSONFeature | GeoJSONFeatureCollection
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  let allCoordinates: [number, number][] = [];

  if (geojson.type === "Feature") {
    if (geojson.geometry.type === "LineString") {
      allCoordinates = geojson.geometry.coordinates;
    } else if (geojson.geometry.type === "Point") {
      allCoordinates = [geojson.geometry.coordinates];
    }
  } else if (geojson.type === "FeatureCollection") {
    for (const feature of geojson.features) {
      if (feature.geometry.type === "LineString") {
        allCoordinates.push(...feature.geometry.coordinates);
      } else if (feature.geometry.type === "Point") {
        allCoordinates.push(feature.geometry.coordinates);
      }
    }
  }

  if (allCoordinates.length === 0) {
    return { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 };
  }

  const lons = allCoordinates.map((c) => c[0]);
  const lats = allCoordinates.map((c) => c[1]);

  return {
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
}

/**
 * Validate GeoJSON structure
 */
export function isValidGeoJSON(data: unknown): data is GeoJSONFeature | GeoJSONFeatureCollection {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  if (obj.type === "Feature") {
    return "geometry" in obj && typeof obj.geometry === "object";
  }

  if (obj.type === "FeatureCollection") {
    return "features" in obj && Array.isArray(obj.features);
  }

  return false;
}
