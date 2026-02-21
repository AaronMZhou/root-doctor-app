export interface LatLng {
  lat: number;
  lng: number;
}

export function getDistanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;

  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function getBoundingBox(center: LatLng, radiusKm: number) {
  const latDelta = radiusKm / 110.574;
  const cosLat = Math.cos(center.lat * Math.PI / 180);
  const lngDelta = radiusKm / (111.32 * Math.max(0.01, cosLat));

  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}
