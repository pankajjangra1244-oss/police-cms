'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface Hotspot {
  location: string;
  latitude: number;
  longitude: number;
  count: number;
  types: string[];
}

function FitBounds({ hotspots }: { hotspots: Hotspot[] }) {
  const map = useMap();
  useEffect(() => {
    if (hotspots.length > 0) {
      const bounds: [number, number][] = hotspots.map(h => [h.latitude, h.longitude]);
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [hotspots, map]);
  return null;
}

export default function HotspotMap({ hotspots }: { hotspots: Hotspot[] }) {
  const maxCount = Math.max(...hotspots.map(h => h.count), 1);

  return (
    <MapContainer
      center={[20.5937, 78.9629]} // India center
      zoom={5}
      scrollWheelZoom={true}
      style={{ height: '400px', width: '100%', borderRadius: '1rem' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {hotspots.map((h, i) => {
        const intensity = h.count / maxCount;
        const radius = 8 + intensity * 25;
        const color = intensity > 0.7 ? '#ef4444' : intensity > 0.4 ? '#f97316' : '#f59e0b';
        return (
          <CircleMarker
            key={i}
            center={[h.latitude, h.longitude]}
            radius={radius}
            pathOptions={{
              color, fillColor: color, fillOpacity: 0.5 + intensity * 0.3, weight: 2, opacity: 0.8
            }}
          >
            <Popup>
              <div className="text-sm font-medium">{h.location}</div>
              <div className="text-xs text-gray-600">{h.count} incident{h.count !== 1 ? 's' : ''}</div>
              {h.types?.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">Types: {h.types.join(', ')}</div>
              )}
            </Popup>
          </CircleMarker>
        );
      })}
      {hotspots.length > 0 && <FitBounds hotspots={hotspots} />}
    </MapContainer>
  );
}
