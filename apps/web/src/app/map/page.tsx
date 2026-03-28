'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageLoading } from '@/components/loading-spinner';
import { MOCK_MAP_PROFESSIONALS } from '@/lib/mock-data';
import { ArrowLeft, MapPin, Star, Filter } from 'lucide-react';
import { clsx } from 'clsx';
import dynamic from 'next/dynamic';

const CATEGORY_COLORS: Record<string, string> = {
  CLEANING: '#10b981',
  TUTORING: '#3b82f6',
  PERSONAL_CARE: '#ec4899',
  BABYSITTING: '#8b5cf6',
  PET_SITTING: '#f59e0b',
};

const CATEGORY_FILTERS = [
  { key: '', label: 'Tutti', icon: '📍' },
  { key: 'CLEANING', label: 'Pulizie', icon: '✨' },
  { key: 'TUTORING', label: 'Ripetizioni', icon: '📚' },
  { key: 'BABYSITTING', label: 'Babysitting', icon: '👶' },
  { key: 'PERSONAL_CARE', label: 'Cura personale', icon: '💆' },
  { key: 'PET_SITTING', label: 'Pet Sitting', icon: '🐾' },
];

// Dynamically import the map to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('./map-component'), { ssr: false });

export default function MapPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPro, setSelectedPro] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const filteredPros = useMemo(() => {
    if (!selectedCategory) return MOCK_MAP_PROFESSIONALS;
    return MOCK_MAP_PROFESSIONALS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  if (loading || !user) return <PageLoading />;

  const selected = selectedPro ? MOCK_MAP_PROFESSIONALS.find((p) => p.profileId === selectedPro) : null;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white z-20 border-b border-gray-100 px-4 pt-12 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Mappa professionisti</h1>
            <p className="text-xs text-gray-400">{filteredPros.length} professionisti nella tua zona</p>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.key}
              onClick={() => { setSelectedCategory(cat.key); setSelectedPro(null); }}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all',
                selectedCategory === cat.key
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-gray-200 text-gray-500'
              )}
            >
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapComponent
          professionals={filteredPros}
          selectedId={selectedPro}
          onSelectPro={setSelectedPro}
          categoryColors={CATEGORY_COLORS}
        />
      </div>

      {/* Selected professional card */}
      {selected && (
        <div className="absolute bottom-20 left-4 right-4 z-[1000]">
          <div className="card-elevated p-4 bg-white/95 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[selected.category] || '#6b7280' }}
              >
                {selected.firstName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">{selected.firstName} {selected.lastName}</h3>
                  {selected.hourlyRate && (
                    <span className="text-sm font-bold text-accent-600 bg-accent-50 px-2 py-0.5 rounded-lg">
                      {selected.hourlyRate}/h
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{selected.services.join(', ')}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-amber-400" fill="#fbbf24" />
                    <span className="text-xs font-medium text-gray-700">{selected.averageRating}</span>
                    <span className="text-xs text-gray-400">({selected.reviewCount})</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <MapPin size={10} /> {selected.distance.toFixed(1)} km
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push(`/professional/${selected.profileId}`)}
              className="btn-primary w-full mt-3 text-sm py-2.5"
            >
              Vedi profilo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
