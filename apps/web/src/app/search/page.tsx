'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { getCurrentPosition } from '@/lib/geolocation';
import { ProfessionalCard } from '@/components/professional-card';
import { SwipeCard } from '@/components/swipe-card';
import { PageLoading } from '@/components/loading-spinner';
import { List, Layers, ArrowLeft, SlidersHorizontal, Calendar, Clock, MapPin, X, Check, Star, Shield, Zap, Globe, Euro } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

type ViewMode = 'list' | 'swipe';

const DAY_OPTIONS = [
  { value: -1, label: 'Qualsiasi', short: 'Tutti' },
  { value: 0, label: 'Domenica', short: 'Dom' },
  { value: 1, label: 'Lunedì', short: 'Lun' },
  { value: 2, label: 'Martedì', short: 'Mar' },
  { value: 3, label: 'Mercoledì', short: 'Mer' },
  { value: 4, label: 'Giovedì', short: 'Gio' },
  { value: 5, label: 'Venerdì', short: 'Ven' },
  { value: 6, label: 'Sabato', short: 'Sab' },
];

const TIME_SLOTS = [
  { value: '', label: 'Qualsiasi' },
  { value: '07:00', label: '7:00' },
  { value: '09:00', label: '9:00' },
  { value: '12:00', label: '12:00' },
  { value: '14:00', label: '14:00' },
  { value: '16:00', label: '16:00' },
  { value: '18:00', label: '18:00' },
  { value: '20:00', label: '20:00' },
];

const DISTANCE_OPTIONS = [
  { value: 0, label: 'Qualsiasi' },
  { value: 1, label: 'Entro 1 km' },
  { value: 2, label: 'Entro 2 km' },
  { value: 5, label: 'Entro 5 km' },
  { value: 10, label: 'Entro 10 km' },
];

const RATING_OPTIONS = [
  { value: 0, label: 'Qualsiasi' },
  { value: 4.5, label: '4.5+' },
  { value: 4.7, label: '4.7+' },
  { value: 4.9, label: '4.9+' },
];

const PRICE_RANGE_OPTIONS = [
  { value: [0, 999], label: 'Qualsiasi' },
  { value: [0, 20], label: '< €20/h' },
  { value: [20, 35], label: '€20-35/h' },
  { value: [35, 50], label: '€35-50/h' },
  { value: [50, 999], label: '> €50/h' },
];

const LANGUAGE_OPTIONS = [
  { value: '', label: 'Qualsiasi' },
  { value: 'Italiano', label: '🇮🇹 Italiano' },
  { value: 'Inglese', label: '🇬🇧 Inglese' },
  { value: 'Francese', label: '🇫🇷 Francese' },
  { value: 'Spagnolo', label: '🇪🇸 Spagnolo' },
  { value: 'Tedesco', label: '🇩🇪 Tedesco' },
];

const SORT_OPTIONS = [
  { key: 'distance', label: 'Distanza' },
  { key: 'rating', label: 'Valutazione' },
  { key: 'price_low', label: 'Prezzo ↑' },
  { key: 'price_high', label: 'Prezzo ↓' },
];

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

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterDay, setFilterDay] = useState(-1);
  const [filterTime, setFilterTime] = useState('');
  const [filterDistance, setFilterDistance] = useState(0);
  const [filterRating, setFilterRating] = useState(0);
  const [filterPriceRange, setFilterPriceRange] = useState<number[]>([0, 999]);
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterImmediate, setFilterImmediate] = useState(false);
  const [sortBy, setSortBy] = useState('distance');

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
          dayOfWeek: filterDay >= 0 ? filterDay : undefined,
          preferredTime: filterTime || undefined,
          maxDistance: filterDistance > 0 ? filterDistance : undefined,
        })
        .then((results) => {
          setProfessionals(results);
          setSwipeIndex(0);
        })
        .catch(() => setProfessionals([]))
        .finally(() => setLoading(false));
    }
  }, [selectedService, location, filterDay, filterTime, filterDistance]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  // Client-side filtering and sorting
  const filteredProfessionals = useMemo(() => {
    let pros = [...professionals];

    // Distance filter (client-side for demo)
    if (filterDistance > 0) {
      pros = pros.filter((p) => p.distance <= filterDistance);
    }

    // Rating filter
    if (filterRating > 0) {
      pros = pros.filter((p) => (p.averageRating || 0) >= filterRating);
    }

    // Price range filter
    if (filterPriceRange[0] > 0 || filterPriceRange[1] < 999) {
      pros = pros.filter((p) => {
        const rate = p.hourlyRate || 0;
        return rate >= filterPriceRange[0] && rate <= filterPriceRange[1];
      });
    }

    // Language filter
    if (filterLanguage) {
      pros = pros.filter((p) => p.languages?.includes(filterLanguage));
    }

    // Verified filter
    if (filterVerified) {
      pros = pros.filter((p) => p.verified);
    }

    // Immediately available filter
    if (filterImmediate) {
      pros = pros.filter((p) => p.immediatelyAvailable);
    }

    // Sort
    if (sortBy === 'distance') {
      pros.sort((a, b) => a.distance - b.distance);
    } else if (sortBy === 'rating') {
      pros.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    } else if (sortBy === 'price_low') {
      pros.sort((a, b) => (a.hourlyRate || 0) - (b.hourlyRate || 0));
    } else if (sortBy === 'price_high') {
      pros.sort((a, b) => (b.hourlyRate || 0) - (a.hourlyRate || 0));
    }

    return pros;
  }, [professionals, filterDistance, filterRating, filterPriceRange, filterLanguage, filterVerified, filterImmediate, sortBy]);

  const hasActiveFilters = filterDay >= 0 || !!filterTime || filterDistance > 0 || filterRating > 0 || filterPriceRange[0] > 0 || filterPriceRange[1] < 999 || !!filterLanguage || filterVerified || filterImmediate;

  const resetFilters = () => {
    setFilterDay(-1);
    setFilterTime('');
    setFilterDistance(0);
    setFilterRating(0);
    setFilterPriceRange([0, 999]);
    setFilterLanguage('');
    setFilterVerified(false);
    setFilterImmediate(false);
    setSortBy('distance');
  };

  if (authLoading || !user) return <PageLoading />;

  const currentSwipePro = filteredProfessionals[swipeIndex];

  return (
    <div className="page-container pt-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold flex-1">Cerca professionisti</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={clsx(
            'p-2 rounded-xl transition-all relative',
            showFilters ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-500',
          )}
        >
          <SlidersHorizontal size={18} />
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border-2 border-white" />
          )}
        </button>
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

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="card-elevated p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Filtri di ricerca</h3>
                {hasActiveFilters && (
                  <button onClick={resetFilters} className="text-xs text-primary-600 font-semibold flex items-center gap-1">
                    <X size={12} /> Resetta
                  </button>
                )}
              </div>

              {/* Day */}
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Calendar size={11} /> Giorno
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_OPTIONS.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setFilterDay(d.value)}
                      className={clsx(
                        'px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                        filterDay === d.value
                          ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-600 border border-gray-100',
                      )}
                    >
                      {d.short}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Clock size={11} /> Orario preferito
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TIME_SLOTS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setFilterTime(t.value)}
                      className={clsx(
                        'px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                        filterTime === t.value
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-600 border border-gray-100',
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Distance */}
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <MapPin size={11} /> Distanza
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DISTANCE_OPTIONS.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setFilterDistance(d.value)}
                      className={clsx(
                        'px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                        filterDistance === d.value
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-600 border border-gray-100',
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Star size={11} /> Valutazione minima
                </label>
                <div className="flex gap-1.5">
                  {RATING_OPTIONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setFilterRating(r.value)}
                      className={clsx(
                        'px-3 py-1.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1',
                        filterRating === r.value
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-600 border border-gray-100',
                      )}
                    >
                      {r.value > 0 && <Star size={12} fill="currentColor" />}
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Euro size={11} /> Fascia di prezzo
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRICE_RANGE_OPTIONS.map((pr) => (
                    <button
                      key={pr.label}
                      onClick={() => setFilterPriceRange(pr.value)}
                      className={clsx(
                        'px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                        filterPriceRange[0] === pr.value[0] && filterPriceRange[1] === pr.value[1]
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-600 border border-gray-100',
                      )}
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Globe size={11} /> Lingua
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGE_OPTIONS.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => setFilterLanguage(l.value)}
                      className={clsx(
                        'px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                        filterLanguage === l.value
                          ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-600 border border-gray-100',
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle filters: Verified + Immediate */}
              <div className="mb-4 flex gap-3">
                <button
                  onClick={() => setFilterVerified(!filterVerified)}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border',
                    filterVerified
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-gray-50 text-gray-500 border-gray-100',
                  )}
                >
                  <Shield size={14} />
                  Solo verificati
                </button>
                <button
                  onClick={() => setFilterImmediate(!filterImmediate)}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border',
                    filterImmediate
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : 'bg-gray-50 text-gray-500 border-gray-100',
                  )}
                >
                  <Zap size={14} />
                  Disponibili ora
                </button>
              </div>

              {/* Sort */}
              <div className="mb-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Ordina per</label>
                <div className="flex flex-wrap gap-1.5">
                  {SORT_OPTIONS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSortBy(s.key)}
                      className={clsx(
                        'px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                        sortBy === s.key
                          ? 'bg-gray-800 text-white'
                          : 'bg-gray-50 text-gray-600 border border-gray-100',
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowFilters(false)}
                className="w-full btn-primary mt-4 flex items-center justify-center gap-2"
              >
                <Check size={16} /> Applica filtri
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filter pills */}
      {!showFilters && hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {filterDay >= 0 && (
            <span className="text-xs bg-violet-50 text-violet-600 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <Calendar size={10} /> {DAY_OPTIONS.find((d) => d.value === filterDay)?.short}
              <button onClick={() => setFilterDay(-1)}><X size={10} /></button>
            </span>
          )}
          {filterTime && (
            <span className="text-xs bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <Clock size={10} /> {filterTime}
              <button onClick={() => setFilterTime('')}><X size={10} /></button>
            </span>
          )}
          {filterDistance > 0 && (
            <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <MapPin size={10} /> {filterDistance}km
              <button onClick={() => setFilterDistance(0)}><X size={10} /></button>
            </span>
          )}
          {filterRating > 0 && (
            <span className="text-xs bg-yellow-50 text-yellow-600 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <Star size={10} fill="currentColor" /> {filterRating}+
              <button onClick={() => setFilterRating(0)}><X size={10} /></button>
            </span>
          )}
          {(filterPriceRange[0] > 0 || filterPriceRange[1] < 999) && (
            <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <Euro size={10} /> {PRICE_RANGE_OPTIONS.find((pr) => pr.value[0] === filterPriceRange[0] && pr.value[1] === filterPriceRange[1])?.label}
              <button onClick={() => setFilterPriceRange([0, 999])}><X size={10} /></button>
            </span>
          )}
          {filterLanguage && (
            <span className="text-xs bg-pink-50 text-pink-600 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <Globe size={10} /> {filterLanguage}
              <button onClick={() => setFilterLanguage('')}><X size={10} /></button>
            </span>
          )}
          {filterVerified && (
            <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <Shield size={10} /> Verificati
              <button onClick={() => setFilterVerified(false)}><X size={10} /></button>
            </span>
          )}
          {filterImmediate && (
            <span className="text-xs bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <Zap size={10} /> Disponibili ora
              <button onClick={() => setFilterImmediate(false)}><X size={10} /></button>
            </span>
          )}
        </div>
      )}

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
      ) : filteredProfessionals.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🔍</span>
          </div>
          <p className="text-gray-700 font-semibold">Nessun professionista trovato</p>
          <p className="text-gray-400 text-sm mt-1">
            {hasActiveFilters ? 'Prova a modificare i filtri' : 'Prova un altro servizio'}
          </p>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="btn-secondary mt-4 text-sm">
              Resetta filtri
            </button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-3 mt-1">
          <p className="text-sm text-gray-400">
            {filteredProfessionals.length} professionisti{hasActiveFilters ? ' (filtrati)' : ' vicino a te'}
          </p>
          {filteredProfessionals.map((p) => (
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
              onSwipeLeft={() => setSwipeIndex((i) => Math.min(i + 1, filteredProfessionals.length))}
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
                <p className="text-gray-700 font-semibold">Hai visto tutti!</p>
                <button
                  onClick={() => setSwipeIndex(0)}
                  className="btn-secondary mt-4 text-sm"
                >
                  Ricomincia
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
