import {
  GEO_VALIDATION_THRESHOLD_METERS,
  type GeoValidationResult,
} from '@openpaddy/shared';

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

// FR-02: Haversine distance in meters between two WGS84 coordinates
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

// Compute centroid [lat, lng] from GeoJSON Polygon, MultiPolygon, or Point string
export function getParcelCentroid(geometryJson: string): {
  lat: number;
  lng: number;
} {
  const parsed = JSON.parse(geometryJson) as {
    type?: string;
    coordinates?: unknown;
    geometry?: { type?: string; coordinates?: unknown };
  };

  const geom = parsed.geometry ?? parsed;
  if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
    const [lng, lat] = geom.coordinates as [number, number];
    return { lat, lng };
  }

  let ring: [number, number][] = [];
  if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
    ring = (geom.coordinates[0] as [number, number][]) ?? [];
  } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
    const firstPoly = geom.coordinates[0] as [number, number][][] | undefined;
    ring = firstPoly?.[0] ?? [];
  }

  if (ring.length === 0) {
    throw new Error('Invalid parcel GeoJSON geometry');
  }

  // Exclude closing vertex if identical to opening vertex
  const last = ring[ring.length - 1];
  const first = ring[0];
  const points =
    ring.length > 1 && last[0] === first[0] && last[1] === first[1]
      ? ring.slice(0, -1)
      : ring;

  const sum = points.reduce(
    (acc, [lng, lat]) => {
      acc.lng += lng;
      acc.lat += lat;
      return acc;
    },
    { lat: 0, lng: 0 },
  );

  return {
    lat: sum.lat / points.length,
    lng: sum.lng / points.length,
  };
}

// FR-02, NFR: Transparent Vietnamese geo-validation feedback (e.g., "✓ Vị trí khớp (±45m)")
export function validateParcelLocation(
  photoLat: number,
  photoLng: number,
  parcelGeometryJson: string,
  thresholdMeters = GEO_VALIDATION_THRESHOLD_METERS,
): GeoValidationResult {
  const centroid = getParcelCentroid(parcelGeometryJson);
  const distanceMeters = Math.round(
    haversineDistanceMeters(photoLat, photoLng, centroid.lat, centroid.lng),
  );
  const valid = distanceMeters <= thresholdMeters;

  return {
    valid,
    distanceMeters,
    thresholdMeters,
    messageVi: valid
      ? `✓ Vị trí khớp (±${distanceMeters}m)`
      : `✗ Vị trí lệch ${distanceMeters}m (vượt giới hạn ${thresholdMeters}m)`,
  };
}
