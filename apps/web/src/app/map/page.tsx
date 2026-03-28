'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageLoading } from '@/components/loading-spinner';
import { MOCK_MAP_PROFESSIONALS } from '@/lib/mock-data';
import { ArrowLeft, Star, MapPin, Shield, List, Map, Navigation, ChevronRight, X, Clock, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import dynamic from 'next/dynamic';

const CATEGORY_COLORS: Record<string, string> = {
  CLEANING: '#10b981',
  TUTORING: '#3b82f6',
  PERSONAL_CARE: '#ec4899',
  BABYSITTING: '#8b5cf6',
  PET_SITTING: '#f59e0b',
};

const CATEGORY_ICONS: Record<string, string> = {
  CLEANING: '✨',
  TUTORING: '📚',
  PERSONAL_CARE: '💆',
  BABYSITTING: '👶',
  PET_SITTING: '🐾',
};

const CATEGORY_FILTERS = [
  { key: '', label: 'Tutti', icon: '📍' },
  { key: 'CLEANING', label: 'Pulizie', icon: '✨' },
  { key: 'TUTORING', label: 'Ripetizioni', icon: '📚' },
  { key: 'BABYSITTING', label: 'Babysitting', icon: '👶' },
  { key: 'PERSONAL_CARE', label: 'Cura personale', icon: '💆' },
  { key: 'PET_SITTING', label: 'Pet Sitting', icon: '🐾' },
];

const MapComponent = dynamic(() => import('./map-component'), { ssr: false });

export default function MapPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPro, setSelectedPro] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showFilters, setShowFilters] = useState(false);

  // Advanced filters
  const [maxPrice, setMaxPrice] = useState(60);
  const [maxDistance, setMaxDistance] = useState(10);
  const [minRating, setMinRating] = useState(0);
  const [onlyVerified, setOnlyVerified] = useState(false);

  // Track if any advanced filter is active
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (maxPrice < 60) count++;
    if (maxDistance < 10) count++;
    if (minRating > 0) count++;
    if (onlyVerified) count++;
    return count;
  }, [maxPrice, maxDistance, minRating, onlyVerified]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const filteredPros = useMemo(() => {
    let pros = [...MOCK_MAP_PROFESSIONALS];

    // Category filter
    if (selectedCategory) {
      pros = pros.filter((p) => p.category === selectedCategory);
    }

    // Price filter
    if (maxPrice < 60) {
      pros = pros.filter((p) => p.hourlyRate <= maxPrice);
    }

    // Distance filter
    if (maxDistance < 10) {
      pros = pros.filter((p) => p.distance <= maxDistance);
    }

    // Rating filter
    if (minRating > 0) {
      pros = pros.filter((p) => p.averageRating >= minRating);
    }

    // Verified filter
    if (onlyVerified) {
      pros = pros.filter((p) => p.verified);
    }

    return pros.sort((a, b) => a.distance - b.distance);
  }, [selectedCategory, maxPrice, maxDistance, minRating, onlyVerified]);

  const handleReset = () => {
    setMaxPrice(60);
    setMaxDistance(10);
    setMinRating(0);
    setOnlyVerified(false);
  };

  if (loading || !user) return <PageLoading />;

  const selected = selectedPro ? MOCK_MAP_PROFESSIONALS.find((p) => p.profileId === selectedPro) : null;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white z-20 border-b border-gray-100 px-4 pt-12 pb-3 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.push('/')} className="p-1.5 rounded-xl bg-gray-50 text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Mappa professionisti</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Navigation size={10} className="text-primary-500" />
              <p className="text-xs text-gray-400">Milano &middot; {filteredPros.length} professionisti</p>
            </div>
          </div>

          {/* Filter button */}
          <button
            onClick={() => setShowFilters(true)}
            className={clsx(
              'relative p-2 rounded-xl transition-all',
              activeFilterCount > 0 ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-400'
            )}
          >
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] min-h-[18px] bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('map')}
              className={clsx(
                'p-2 rounded-lg transition-all',
                viewMode === 'map' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-400'
              )}
            >
              <Map size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'p-2 rounded-lg transition-all',
                viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-400'
              )}
            >
              <List size={16} />
            </button>
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
                  ? 'bg-primary-50 border-primary-300 text-primary-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              )}
            >
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="flex-1 relative">
          <MapComponent
            professionals={filteredPros}
            selectedId={selectedPro}
            onSelectPro={setSelectedPro}
            categoryColors={CATEGORY_COLORS}
            categoryIcons={CATEGORY_ICONS}
          />

          {/* Selected professional bottom sheet */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ y: 200, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 200, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute bottom-20 left-3 right-3 z-[1000]"
              >
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="h-1" style={{ background: CATEGORY_COLORS[selected.category] || '#6b7280' }} />
                  <div className="p-4">
                    <button
                      onClick={() => setSelectedPro(null)}
                      className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                    <div className="flex items-start gap-3">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ backgroundColor: `${CATEGORY_COLORS[selected.category]}15` }}
                      >
                        {CATEGORY_ICONS[selected.category] || '📍'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">{selected.firstName} {selected.lastName}</h3>
                          {selected.verified && <Shield size={14} className="text-blue-500" />}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{selected.services.join(' · ')}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1">
                            <Star size={13} className="text-amber-400" fill="#fbbf24" />
                            <span className="text-sm font-semibold text-gray-800">{selected.averageRating}</span>
                            <span className="text-xs text-gray-400">({selected.reviewCount})</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <MapPin size={11} /> {selected.distance.toFixed(1)} km
                          </div>
                          {selected.hourlyRate && (
                            <span className="text-sm font-bold text-primary-600">{selected.hourlyRate}/h</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <span className="text-[10px] px-2 py-1 rounded-lg bg-gray-50 text-gray-500 font-medium">
                        <Clock size={9} className="inline -mt-0.5 mr-0.5" /> {selected.age} anni
                      </span>
                      <span
                        className="text-[10px] px-2 py-1 rounded-lg font-medium"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[selected.category]}15`,
                          color: CATEGORY_COLORS[selected.category],
                        }}
                      >
                        {CATEGORY_FILTERS.find((c) => c.key === selected.category)?.label}
                      </span>
                      {selected.verified && (
                        <span className="text-[10px] px-2 py-1 rounded-lg bg-blue-50 text-blue-600 font-medium">Verificato</span>
                      )}
                    </div>
                    <button
                      onClick={() => router.push(`/professional/${selected.profileId}`)}
                      className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                      style={{ background: `linear-gradient(135deg, ${CATEGORY_COLORS[selected.category]}, ${CATEGORY_COLORS[selected.category]}dd)` }}
                    >
                      Vedi profilo <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="flex-1 overflow-y-auto pb-24">
          <div className="px-4 pt-3 space-y-2.5">
            {filteredPros.map((pro, i) => (
              <motion.div
                key={pro.profileId}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <button
                  onClick={() => router.push(`/professional/${pro.profileId}`)}
                  className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: `${CATEGORY_COLORS[pro.category]}15` }}
                    >
                      {CATEGORY_ICONS[pro.category] || '📍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{pro.firstName} {pro.lastName}</h3>
                        {pro.verified && <Shield size={13} className="text-blue-500" />}
                        <span className="ml-auto text-sm font-bold text-primary-600">{pro.hourlyRate}/h</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{pro.services.join(' · ')}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <Star size={12} className="text-amber-400" fill="#fbbf24" />
                          <span className="text-xs font-semibold text-gray-700">{pro.averageRating}</span>
                          <span className="text-xs text-gray-400">({pro.reviewCount})</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin size={10} /> {pro.distance.toFixed(1)} km
                        </div>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium ml-auto"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[pro.category]}15`,
                            color: CATEGORY_COLORS[pro.category],
                          }}
                        >
                          {CATEGORY_FILTERS.find((c) => c.key === pro.category)?.label}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 mt-3 flex-shrink-0" />
                  </div>
                </button>
              </motion.div>
            ))}

            {filteredPros.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-gray-400 font-medium">Nessun professionista trovato</p>
                <p className="text-xs text-gray-300 mt-1">Prova a modificare i filtri</p>
                <button
                  onClick={handleReset}
                  className="mt-4 text-sm text-primary-600 font-medium flex items-center gap-1 mx-auto hover:underline"
                >
                  <RotateCcw size={14} /> Reset filtri
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters Bottom Sheet */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            onClick={() => setShowFilters(false)}
          >
            <motion.div
              initial={{ y: 400 }}
              animate={{ y: 0 }}
              exit={{ y: 400 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle bar */}
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Filtri avanzati</h3>
                <button onClick={() => setShowFilters(false)} className="p-2 text-gray-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Max Price */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Prezzo massimo</label>
                    <span className="text-sm font-bold text-primary-600">
                      {maxPrice >= 60 ? 'Tutti' : `€${maxPrice}/h`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={5}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>€5/h</span>
                    <span>€60/h</span>
                  </div>
                </div>

                {/* Max Distance */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Distanza massima</label>
                    <span className="text-sm font-bold text-primary-600">
                      {maxDistance >= 10 ? 'Tutti' : `${maxDistance} km`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>0.5 km</span>
                    <span>10 km</span>
                  </div>
                </div>

                {/* Min Rating */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Valutazione minima</label>
                    <span className="text-sm font-bold text-primary-600">
                      {minRating === 0 ? 'Tutte' : `${minRating}+`}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[0, 3, 3.5, 4, 4.5, 4.8].map((val) => (
                      <button
                        key={val}
                        onClick={() => setMinRating(val)}
                        className={clsx(
                          'flex-1 py-2 rounded-xl text-xs font-medium border transition-all',
                          minRating === val
                            ? 'bg-primary-50 border-primary-300 text-primary-700'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                        )}
                      >
                        {val === 0 ? 'Tutte' : (
                          <span className="flex items-center justify-center gap-0.5">
                            <Star size={10} className="text-amber-400" fill="#fbbf24" />
                            {val}+
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Only Verified */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-blue-500" />
                    <label className="text-sm font-medium text-gray-700">Solo verificati</label>
                  </div>
                  <button
                    onClick={() => setOnlyVerified(!onlyVerified)}
                    className={clsx(
                      'w-12 h-7 rounded-full p-0.5 transition-colors duration-200',
                      onlyVerified ? 'bg-primary-500' : 'bg-gray-200'
                    )}
                  >
                    <motion.div
                      layout
                      className="w-6 h-6 bg-white rounded-full shadow-sm"
                      animate={{ x: onlyVerified ? 20 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors"
                >
                  <RotateCcw size={14} /> Reset
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-[2] btn-primary py-3 text-sm"
                >
                  Mostra {filteredPros.length} risultati
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
