'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { getCurrentPosition } from '@/lib/geolocation';
import { ProfessionalCard } from '@/components/professional-card';
import { SwipeCard } from '@/components/swipe-card';
import { PageLoading } from '@/components/loading-spinner';
import { List, Layers, ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';

type ViewMode = 'list' | 'swipe';

export default function SearchPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
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

  useEffect(() => {
    api.getServices(category || undefined).then(setServices);
  }, [category]);

  useEffect(() => {
    getCurrentPosition()
      .then(setLocation)
      .catch(() => {
        setLocation({ latitude: 48.8566, longitude: 2.3522 });
      });
  }, []);

  useEffect(() => {
    if (services.length > 0 && !selectedService) {
      setSelectedService(services[0].id);
    }
  }, [services, selectedService]);

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
    <div className="page-container pt-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold flex-1">Find Professionals</h1>
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setViewMode('list')}
            className={clsx(
              'p-2 rounded-lg transition-all duration-200',
              viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-400',
            )}
          >
            <List size={18} />
          </button>
          <button
            onClick={() => setViewMode('swipe')}
            className={clsx(
              'p-2 rounded-lg transition-all duration-200',
              viewMode === 'swipe' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-400',
            )}
          >
            <Layers size={18} />
          </button>
        </div>
      </div>

      {/* Service pills */}
      <div className="flex gap-2 overflow-x-auto pb-4 -mx-5 px-5 scrollbar-hide">
        {services.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedService(s.id)}
            className={clsx(
              'flex-shrink-0 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200',
              selectedService === s.id
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/20'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100 shadow-sm',
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
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🔍</span>
          </div>
          <p className="text-gray-700 font-semibold">No professionals found</p>
          <p className="text-gray-400 text-sm mt-1">Try a different service or expand your area</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-3 mt-1">
          <p className="text-sm text-gray-400">{professionals.length} professionals near you</p>
          {professionals.map((p) => (
            <ProfessionalCard
              key={p.profileId}
              professional={p}
              onClick={() => router.push(`/professional/${p.profileId}`)}
            />
          ))}
        </div>
      ) : (
        <div className="relative h-[65vh] mt-2">
          {currentSwipePro ? (
            <SwipeCard
              key={currentSwipePro.profileId}
              professional={currentSwipePro}
              onSwipeLeft={() => setSwipeIndex((i) => Math.min(i + 1, professionals.length))}
              onSwipeRight={() => {
                router.push(`/professional/${currentSwipePro.profileId}`);
              }}
              onTap={() => router.push(`/professional/${currentSwipePro.profileId}`)}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">👋</span>
                </div>
                <p className="text-gray-700 font-semibold">You&apos;ve seen everyone!</p>
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
