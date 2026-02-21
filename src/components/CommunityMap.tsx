import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

export interface MapIssuePoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  confidence: number;
  displayName: string;
  createdAt: string;
}

interface CommunityMapProps {
  issues: MapIssuePoint[];
  userLocation: { lat: number; lng: number } | null;
}

const issueIcon = L.divIcon({
  className: 'map-dot map-dot-issue',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
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
      map.setView(points[0], 13);
      return;
    }

    map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 13 });
  }, [map, points]);

  return null;
}

export default function CommunityMap({ issues, userLocation }: CommunityMapProps) {
  const points = useMemo<[number, number][]>(() => {
    const issuePoints = issues.map(issue => [issue.lat, issue.lng] as [number, number]);
    if (userLocation) issuePoints.push([userLocation.lat, userLocation.lng]);
    return issuePoints;
  }, [issues, userLocation]);

  const initialCenter: [number, number] = points[0] ?? [0, 0];

  return (
    <MapContainer
      center={initialCenter}
      zoom={12}
      scrollWheelZoom={false}
      className="h-72 w-full rounded-2xl z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitMapToPoints points={points} />

      {issues.map(issue => (
        <Marker key={issue.id} position={[issue.lat, issue.lng]} icon={issueIcon}>
          <Popup>
            <div className="space-y-1">
              <p className="text-sm font-semibold">{issue.label}</p>
              <p className="text-xs text-muted-foreground">{Math.round(issue.confidence * 100)}% confidence</p>
              <p className="text-xs text-muted-foreground">By {issue.displayName}</p>
              <p className="text-xs text-muted-foreground">{new Date(issue.createdAt).toLocaleString()}</p>
            </div>
          </Popup>
        </Marker>
      ))}

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
