'use client';

import { useEffect, useRef } from 'react';

interface Professional {
  profileId: string;
  firstName: string;
  lastName: string;
  category: string;
  averageRating: number | null;
  hourlyRate: number | null;
  lat: number;
  lng: number;
}

interface MapComponentProps {
  professionals: Professional[];
  selectedId: string | null;
  onSelectPro: (id: string | null) => void;
  categoryColors: Record<string, string>;
}

export default function MapComponent({ professionals, selectedId, onSelectPro, categoryColors }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const loadLeaflet = async () => {
      if ((window as any).L) return (window as any).L;

      return new Promise<any>((resolve) => {
        if (document.getElementById('leaflet-js')) {
          const check = setInterval(() => {
            if ((window as any).L) { clearInterval(check); resolve((window as any).L); }
          }, 50);
          return;
        }
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve((window as any).L);
        document.head.appendChild(script);
      });
    };

    loadLeaflet().then((L) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(mapRef.current!, {
        center: [45.4642, 9.1900],
        zoom: 13,
        zoomControl: false,
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      updateMarkers(L, map);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !(window as any).L) return;
    updateMarkers((window as any).L, mapInstanceRef.current);
  }, [professionals, selectedId]);

  function updateMarkers(L: any, map: any) {
    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    professionals.forEach((pro) => {
      const color = categoryColors[pro.category] || '#6b7280';
      const isSelected = pro.profileId === selectedId;
      const size = isSelected ? 40 : 30;

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${color};
          border: 3px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.7)'};
          box-shadow: ${isSelected ? '0 0 0 3px ' + color + ', 0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.2)'};
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: ${isSelected ? '16px' : '12px'};
          cursor: pointer;
          transition: all 0.2s;
          z-index: ${isSelected ? 1000 : 1};
        ">${pro.firstName[0]}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([pro.lat, pro.lng], { icon }).addTo(map);
      marker.on('click', () => {
        onSelectPro(pro.profileId === selectedId ? null : pro.profileId);
      });
      markersRef.current.push(marker);
    });
  }

  return <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px' }} />;
}
