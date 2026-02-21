import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { getDiseaseInfo } from '@/lib/disease-data';

export interface OutbreakMapPoint {
  id: string;
  lat: number;
  lng: number;
  diseaseLabel: string;
  summary: string;
  severity: string | null;
  radiusKm: number;
  nearbyCount: number;
  createdAt: string;
}

interface OutbreakMapProps {
  alerts: OutbreakMapPoint[];
  userLocation: { lat: number; lng: number } | null;
}

const outbreakIcon = L.divIcon({
  className: 'map-dot map-dot-outbreak',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const userIcon = L.divIcon({
  className: 'map-dot map-dot-user',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FitMapToPoints({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      map.setView([0, 0], 2);
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }

    map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 12 });
  }, [map, points]);

  return null;
}

export default function OutbreakMap({ alerts, userLocation }: OutbreakMapProps) {
  const points = useMemo<[number, number][]>(() => {
    const alertPoints = alerts.map(a => [a.lat, a.lng] as [number, number]);
    if (userLocation) {
      alertPoints.push([userLocation.lat, userLocation.lng]);
    }
    return alertPoints;
  }, [alerts, userLocation]);

  const initialCenter: [number, number] = points[0] ?? [0, 0];

  return (
    <MapContainer
      center={initialCenter}
      zoom={10}
      scrollWheelZoom={false}
      className="h-72 w-full rounded-2xl z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitMapToPoints points={points} />

      {alerts.map(alert => {
        const disease = getDiseaseInfo(alert.diseaseLabel);
        return (
          <Marker key={alert.id} position={[alert.lat, alert.lng]} icon={outbreakIcon}>
            <Popup>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{disease.fullName}</p>
                <p className="text-xs text-muted-foreground">Severity: {(alert.severity ?? 'medium').toUpperCase()}</p>
                <p className="text-xs text-muted-foreground">{alert.summary}</p>
                <p className="text-xs text-muted-foreground">{alert.nearbyCount} nearby reports</p>
                <p className="text-xs text-muted-foreground">{new Date(alert.createdAt).toLocaleString()}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>
            <p className="text-sm font-semibold">You are here</p>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
