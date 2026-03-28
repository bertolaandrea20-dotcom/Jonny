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
  services: string[];
  verified: boolean;
}

interface MapComponentProps {
  professionals: Professional[];
  selectedId: string | null;
  onSelectPro: (id: string | null) => void;
  categoryColors: Record<string, string>;
  categoryIcons: Record<string, string>;
}

export default function MapComponent({ professionals, selectedId, onSelectPro, categoryColors, categoryIcons }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

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

    // Custom marker animation styles
    if (!document.getElementById('map-custom-css')) {
      const style = document.createElement('style');
      style.id = 'map-custom-css';
      style.textContent = `
        @keyframes marker-pulse {
          0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.5); }
          70% { box-shadow: 0 0 0 12px rgba(99, 102, 241, 0); }
          100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }
        @keyframes marker-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes user-pulse {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(3); opacity: 0; }
        }
        .marker-selected {
          animation: marker-bounce 0.6s ease-in-out;
        }
        .user-pulse-ring {
          animation: user-pulse 2s ease-out infinite;
        }
        .leaflet-container {
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 16px !important;
          box-shadow: 0 8px 30px rgba(0,0,0,0.12) !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
        }
        .leaflet-popup-tip {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
        }
      `;
      document.head.appendChild(style);
    }

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

      // Use CartoDB Voyager tiles for a cleaner modern look
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // Add user location marker (Milan center)
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div style="position: relative; width: 20px; height: 20px;">
            <div class="user-pulse-ring" style="position: absolute; inset: 0; border-radius: 50%; background: #6366f1;"></div>
            <div style="position: absolute; inset: 2px; border-radius: 50%; background: #6366f1; border: 3px solid white; box-shadow: 0 2px 8px rgba(99,102,241,0.4); z-index: 2;"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      userMarkerRef.current = L.marker([45.4642, 9.1900], { icon: userIcon, zIndexOffset: 2000 }).addTo(map);

      // Click on map to deselect
      map.on('click', () => onSelectPro(null));

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
    const L = (window as any).L;
    updateMarkers(L, mapInstanceRef.current);

    // Pan to selected marker
    if (selectedId) {
      const pro = professionals.find((p) => p.profileId === selectedId);
      if (pro) {
        mapInstanceRef.current.panTo([pro.lat, pro.lng], { animate: true, duration: 0.5 });
      }
    }
  }, [professionals, selectedId]);

  function updateMarkers(L: any, map: any) {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    professionals.forEach((pro) => {
      const color = categoryColors[pro.category] || '#6b7280';
      const emoji = categoryIcons[pro.category] || '📍';
      const isSelected = pro.profileId === selectedId;
      const size = isSelected ? 48 : 38;

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div class="${isSelected ? 'marker-selected' : ''}" style="
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: ${isSelected ? color : 'white'};
            border: ${isSelected ? '3px solid white' : `2px solid ${color}`};
            box-shadow: ${isSelected
              ? `0 0 0 3px ${color}, 0 6px 20px rgba(0,0,0,0.25)`
              : `0 2px 10px rgba(0,0,0,0.15)`};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${isSelected ? '22px' : '18px'};
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: ${isSelected ? 1000 : 1};
            ${isSelected ? 'animation: marker-pulse 2s infinite;' : ''}
          ">${emoji}</div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([pro.lat, pro.lng], { icon, zIndexOffset: isSelected ? 1000 : 0 }).addTo(map);

      // Tooltip on hover
      marker.bindTooltip(
        `<div style="font-size: 12px; font-weight: 600; padding: 2px 4px;">${pro.firstName} ${pro.lastName}<br/><span style="font-weight: 400; color: #6b7280;">${pro.services[0]}</span></div>`,
        {
          direction: 'top',
          offset: [0, -(size / 2 + 4)],
          className: 'custom-tooltip',
        }
      );

      marker.on('click', (e: any) => {
        e.originalEvent?.stopPropagation();
        onSelectPro(pro.profileId === selectedId ? null : pro.profileId);
      });
      markersRef.current.push(marker);
    });
  }

  return <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px' }} />;
}
