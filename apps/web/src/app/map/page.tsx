'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageLoading } from '@/components/loading-spinner';
import { MOCK_MAP_PROFESSIONALS, MOCK_SERVICES } from '@/lib/mock-data';
import { ArrowLeft, Star, MapPin, Shield, List, Map, Navigation, ChevronRight, X, Clock, Calendar, SlidersHorizontal, RotateCcw, Zap, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import dynamic from 'next/dynamic';
import {
  Filters,
  DEFAULT_FILTERS,
  DAY_BUTTONS,
  TIME_OPTIONS,
  PRICE_OPTIONS,
  DISTANCE_OPTIONS,
  RATING_OPTIONS,
  LANGUAGE_OPTIONS,
  applyAllFilters,
  countActiveFilters,
} from '@/lib/filters';

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
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [selectedPro, setSelectedPro] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showFilters, setShowFilters] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setSelectedPro(null);
  }, []);

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const filteredPros = useMemo(() => {
    return applyAllFilters(MOCK_MAP_PROFESSIONALS, filters).sort((a, b) => a.distance - b.distance);
  }, [filters]);

  // Reset selectedPro if filtered out
  useEffect(() => {
    if (selectedPro && !filteredPros.some((p) => p.profileId === selectedPro)) {
      setSelectedPro(null);
    }
  }, [filteredPros, selectedPro]);

  const handleReset = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
    setSelectedPro(null);
  }, []);

  const toggleDay = (day: number) => {
    const days = filters.selectedDays.includes(day)
      ? filters.selectedDays.filter((d) => d !== day)
      : [...filters.selectedDays, day];
    updateFilter('selectedDays', days);
  };

  const setPriceRange = (min: number, max: number) => {
    setFilters((prev) => ({ ...prev, priceMin: min, priceMax: max }));
    setSelectedPro(null);
  };

  const serviceOptions = useMemo(
    () => (filters.category ? MOCK_SERVICES.filter((s) => s.category === filters.category) : []),
    [filters.category]
  );

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
              onClick={() => {
                setFilters((prev) => ({ ...prev, category: cat.key, selectedService: '' }));
                setSelectedPro(null);
              }}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all',
                filters.category === cat.key
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

      {/* Filters Bottom Sheet — rendered in a portal to escape the flex-col h-screen container */}
      {mounted && createPortal(
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[9999] flex items-end justify-center"
            onClick={() => setShowFilters(false)}
          >
            <motion.div
              initial={{ y: 400 }}
              animate={{ y: 0 }}
              exit={{ y: 400 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-3xl w-full max-w-lg flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle bar */}
              <div className="pt-3 pb-2 flex-shrink-0">
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
              </div>

              <div className="flex items-center justify-between px-6 pb-3 flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-900">Filtri avanzati</h3>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={handleReset}
                      className="text-xs text-gray-400 hover:text-primary-500 flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw size={11} /> Reset
                    </button>
                  )}
                  <button onClick={() => setShowFilters(false)} className="p-2 text-gray-400">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="px-6 overflow-y-auto flex-1 space-y-5">
                {/* Specific service */}
                {serviceOptions.length > 0 && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                      Servizio specifico
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => updateFilter('selectedService', '')}
                        className={clsx(
                          'px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                          !filters.selectedService
                            ? 'bg-primary-100 text-primary-700 border border-primary-200'
                            : 'bg-gray-50 text-gray-500 border border-gray-100',
                        )}
                      >
                        Tutti
                      </button>
                      {serviceOptions.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => updateFilter('selectedService', s.name)}
                          className={clsx(
                            'flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                            filters.selectedService === s.name
                              ? 'bg-primary-100 text-primary-700 border border-primary-200'
                              : 'bg-gray-50 text-gray-500 border border-gray-100',
                          )}
                        >
                          {s.icon} {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Days */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar size={12} /> Giorni
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => updateFilter('selectedDays', [])}
                      className={clsx(
                        'px-3 py-2 rounded-xl text-sm font-medium transition-all',
                        filters.selectedDays.length === 0
                          ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100',
                      )}
                    >
                      Tutti
                    </button>
                    {DAY_BUTTONS.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => toggleDay(d.value)}
                        className={clsx(
                          'px-3 py-2 rounded-xl text-sm font-medium transition-all',
                          filters.selectedDays.includes(d.value)
                            ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100',
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time range */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock size={12} /> Fascia oraria
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-gray-400 font-medium mb-1 block">Dalle</span>
                      <select
                        value={filters.timeFrom}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFilters((prev) => ({
                            ...prev,
                            timeFrom: v,
                            timeTo: v && prev.timeTo && v >= prev.timeTo ? '' : prev.timeTo,
                          }));
                        }}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                      >
                        <option value="">--</option>
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-medium mb-1 block">Alle</span>
                      <select
                        value={filters.timeTo}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFilters((prev) => ({
                            ...prev,
                            timeTo: v,
                            timeFrom: v && prev.timeFrom && v <= prev.timeFrom ? '' : prev.timeFrom,
                          }));
                        }}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                      >
                        <option value="">--</option>
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Price range */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                    Prezzo /h
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRICE_OPTIONS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => setPriceRange(p.min, p.max)}
                        className={clsx(
                          'px-3 py-2 rounded-xl text-sm font-medium transition-all',
                          filters.priceMin === p.min && filters.priceMax === p.max
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100',
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Distance */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MapPin size={12} /> Distanza
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DISTANCE_OPTIONS.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => updateFilter('maxDistance', d.value)}
                        className={clsx(
                          'px-3 py-2 rounded-xl text-sm font-medium transition-all',
                          filters.maxDistance === d.value
                            ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100',
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Star size={12} /> Rating minimo
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {RATING_OPTIONS.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => updateFilter('minRating', r.value)}
                        className={clsx(
                          'px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1',
                          filters.minRating === r.value
                            ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100',
                        )}
                      >
                        {r.value > 0 && <Star size={12} fill={filters.minRating === r.value ? 'white' : 'currentColor'} />}
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Globe size={12} /> Lingua
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {LANGUAGE_OPTIONS.map((l) => (
                      <button
                        key={l.value}
                        onClick={() => updateFilter('selectedLanguage', l.value)}
                        className={clsx(
                          'px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1',
                          filters.selectedLanguage === l.value
                            ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100',
                        )}
                      >
                        <span>{l.flag}</span> {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 gap-2 pb-2">
                  <button
                    onClick={() => updateFilter('verifiedOnly', !filters.verifiedOnly)}
                    className={clsx(
                      'flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-all',
                      filters.verifiedOnly
                        ? 'bg-green-50 text-green-600 border-2 border-green-300 shadow-sm'
                        : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100',
                    )}
                  >
                    <Shield size={16} /> Verificato
                  </button>
                  <button
                    onClick={() => updateFilter('immediatelyAvailable', !filters.immediatelyAvailable)}
                    className={clsx(
                      'flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-all',
                      filters.immediatelyAvailable
                        ? 'bg-amber-50 text-amber-600 border-2 border-amber-300 shadow-sm'
                        : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100',
                    )}
                  >
                    <Zap size={16} /> Disponibile ora
                  </button>
                </div>
              </div>

              {/* Action button */}
              <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-full btn-primary py-3 text-sm"
                >
                  Mostra {filteredPros.length} risultati
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body)}
    </div>
  );
}
