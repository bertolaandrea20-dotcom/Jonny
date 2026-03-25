'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { getCurrentPosition } from '@/lib/geolocation';
import { ProfessionalCard } from '@/components/professional-card';
import { SwipeCard } from '@/components/swipe-card';
import { PageLoading } from '@/components/loading-spinner';
import { List, Layers, ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { clsx } from 'clsx';

type ViewMode = 'list' | 'swipe';

export default function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const category = params.get('category');

  // Load services
  useEffect(() => {
    api.getServices(category || undefined).then(setServices);
  }, [category]);

  // Get location
  useEffect(() => {
    getCurrentPosition()
      .then(setLocation)
      .catch(() => {
        // Default to Paris if geolocation denied
        setLocation({ latitude: 48.8566, longitude: 2.3522 });
      });
  }, []);

  // Auto-select first service if only category given
  useEffect(() => {
    if (services.length > 0 && !selectedService) {
      setSelectedService(services[0].id);
    }
  }, [services, selectedService]);

  // Search when service + location ready
  useEffect(() => {
    if (selectedService && location) {
      setLoading(true);
      api
        .searchProfessionals({
          serviceId: selectedService,
          latitude: location.latitude,
          longitude: location.longitude,
        })
        .then((results) => {
          setProfessionals(results);
          setSwipeIndex(0);
        })
        .catch(() => setProfessionals([]))
        .finally(() => setLoading(false));
    }
  }, [selectedService, location]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  if (authLoading || !user) return <PageLoading />;

  const currentSwipePro = professionals[swipeIndex];

  return (
    <div className="page-container pt-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold flex-1">Find Professionals</h1>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={clsx(
              'p-2 rounded-md transition-colors',
              viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-400',
            )}
          >
            <List size={18} />
          </button>
          <button
            onClick={() => setViewMode('swipe')}
            className={clsx(
              'p-2 rounded-md transition-colors',
              viewMode === 'swipe' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-400',
            )}
          >
            <Layers size={18} />
          </button>
        </div>
      </div>

      {/* Service pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
        {services.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedService(s.id)}
            className={clsx(
              'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors',
              selectedService === s.id
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {s.icon} {s.name}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <PageLoading />
      ) : professionals.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500 font-medium">No professionals found nearby</p>
          <p className="text-gray-400 text-sm mt-1">Try expanding your search radius</p>
        </div>
      ) : viewMode === 'list' ? (
        /* List mode */
        <div className="space-y-3 mt-2">
          {professionals.map((p) => (
            <ProfessionalCard
              key={p.profileId}
              professional={p}
              onClick={() => router.push(`/professional/${p.profileId}`)}
            />
          ))}
        </div>
      ) : (
        /* Swipe mode */
        <div className="relative h-[65vh] mt-2">
          {currentSwipePro ? (
            <SwipeCard
              key={currentSwipePro.profileId}
              professional={currentSwipePro}
              onSwipeLeft={() => setSwipeIndex((i) => Math.min(i + 1, professionals.length))}
              onSwipeRight={() => {
                // In the future, this triggers a "like" / match request
                router.push(`/professional/${currentSwipePro.profileId}`);
              }}
              onTap={() => router.push(`/professional/${currentSwipePro.profileId}`)}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-4xl mb-3">👋</p>
                <p className="text-gray-500 font-medium">You&apos;ve seen everyone!</p>
                <button
                  onClick={() => setSwipeIndex(0)}
                  className="btn-secondary mt-4 text-sm"
                >
                  Start over
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
