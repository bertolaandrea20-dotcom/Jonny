'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageLoading } from '@/components/loading-spinner';
import { Avatar } from '@/components/avatar';
import { StarRating } from '@/components/star-rating';
import { formatDistance } from '@/lib/geolocation';
import { MOCK_SWIPE_PROFESSIONALS, MOCK_SERVICES } from '@/lib/mock-data';
import { Filters, DEFAULT_FILTERS, DAY_BUTTONS, TIME_OPTIONS, PRICE_OPTIONS, DISTANCE_OPTIONS, RATING_OPTIONS, LANGUAGE_OPTIONS, applyAllFilters, isFilterActive } from '@/lib/filters';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { MapPin, X, Heart, Shield, RotateCcw, Sparkles, SlidersHorizontal, Briefcase, Calendar, Clock, ChevronDown, Check, MessageCircle, User, Zap, Star, Globe } from 'lucide-react';
import { clsx } from 'clsx';

// ─── Filter constants ───

const CATEGORY_FILTERS = [
  { key: '', label: 'Tutti', icon: '🔥' },
  { key: 'CLEANING', label: 'Pulizie', icon: '✨' },
  { key: 'TUTORING', label: 'Ripetizioni', icon: '📚' },
  { key: 'BABYSITTING', label: 'Babysitting', icon: '👶' },
  { key: 'PERSONAL_CARE', label: 'Cura personale', icon: '💆' },
  { key: 'PET_SITTING', label: 'Pet Sitting', icon: '🐾' },
];

// ─── Service options per category ───

function getServiceOptions(category: string) {
  if (!category) return [];
  return MOCK_SERVICES.filter((s) => s.category === category);
}

// ─── Enhanced Swipe Card ───

function SwipeCardEnhanced({
  professional: p,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  isTop,
}: {
  professional: any;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap: () => void;
  isTop: boolean;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
  const likeOpacity = useTransform(x, [0, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, 0], [1, 0]);
  const scale = useTransform(x, [-300, 0, 300], [0.95, 1, 0.95]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 120) onSwipeRight();
    else if (info.offset.x < -120) onSwipeLeft();
  };

  const CATEGORY_COLORS: Record<string, string> = {
    CLEANING: 'from-emerald-400 to-teal-500',
    TUTORING: 'from-orange-400 to-amber-500',
    BABYSITTING: 'from-violet-400 to-purple-500',
    PERSONAL_CARE: 'from-rose-400 to-pink-500',
    PET_SITTING: 'from-sky-400 to-cyan-500',
  };

  const gradientClass = CATEGORY_COLORS[p.category] || 'from-primary-400 to-primary-600';

  // Show availability summary
  const availDays = p.availability
    ? [...new Set(p.availability.map((a: any) => a.day))].sort() as number[]
    : [];
  const dayLabels = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

  return (
    <motion.div
      className="absolute inset-0 swipe-card"
      style={{ x, rotate, scale }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
      initial={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.6 }}
      animate={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.6 }}
      exit={{ x: 300, opacity: 0, transition: { duration: 0.3 } }}
    >
      <div
        className="h-full rounded-3xl overflow-hidden shadow-xl shadow-gray-300/40 flex flex-col bg-white border border-gray-100"
        onClick={isTop ? onTap : undefined}
      >
        {/* LIKE / NOPE overlays */}
        <motion.div
          className="absolute top-8 right-8 z-20 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-black text-2xl px-6 py-2 rounded-2xl rotate-[-12deg] shadow-lg shadow-green-500/30 border-2 border-white/30"
          style={{ opacity: likeOpacity }}
        >
          LIKE
        </motion.div>
        <motion.div
          className="absolute top-8 left-8 z-20 bg-gradient-to-r from-red-400 to-rose-500 text-white font-black text-2xl px-6 py-2 rounded-2xl rotate-[12deg] shadow-lg shadow-red-500/30 border-2 border-white/30"
          style={{ opacity: nopeOpacity }}
        >
          NOPE
        </motion.div>

        {/* Top gradient banner with avatar */}
        <div className={`relative bg-gradient-to-br ${gradientClass} pt-8 pb-14 flex flex-col items-center`}>
          <div className="absolute inset-0 bg-white/5" />
          <div className="relative z-10">
            <div className="w-24 h-24 rounded-full border-4 border-white/40 shadow-lg overflow-hidden flex items-center justify-center bg-white/20">
              <Avatar src={p.avatarUrl} name={`${p.firstName} ${p.lastName}`} size="xl" />
            </div>
            {p.verified && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md">
                <Shield size={14} className="text-green-500" />
              </div>
            )}
          </div>
        </div>

        {/* Info body */}
        <div className="flex-1 px-5 -mt-7 relative z-10 overflow-y-auto pb-2">
          <div className="bg-white rounded-2xl shadow-md shadow-gray-200/60 p-4 mb-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {p.firstName}, <span className="font-normal text-gray-400">{p.age}</span>
                </h2>
                <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-0.5">
                  <MapPin size={13} />
                  {formatDistance(p.distance)} da te
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-primary-600">{p.hourlyRate}/h</span>
                <div className="mt-0.5">
                  <StarRating rating={p.averageRating} count={p.reviewCount} size={13} />
                </div>
              </div>
            </div>
          </div>

          {p.bio && (
            <p className="text-sm text-gray-600 leading-relaxed mb-3">{p.bio}</p>
          )}

          {/* Services tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {p.services.map((s: string) => (
              <span key={s} className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                {s}
              </span>
            ))}
          </div>

          {/* Availability mini display */}
          {availDays.length > 0 && (
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar size={12} className="text-gray-400" />
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                  <span
                    key={d}
                    className={clsx(
                      'text-[10px] w-7 h-5 flex items-center justify-center rounded-md font-medium',
                      availDays.includes(d)
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-50 text-gray-300',
                    )}
                  >
                    {dayLabels[d]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Filter Panel Component ───

function FilterPanel({
  filters,
  updateFilter,
  resetFilters,
  onApply,
  resultCount,
}: {
  filters: Filters;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;
  onApply: () => void;
  resultCount: number;
}) {
  const serviceOptions = getServiceOptions(filters.category);
  const hasAny = isFilterActive(filters);

  const toggleDay = (day: number) => {
    const days = filters.selectedDays.includes(day)
      ? filters.selectedDays.filter((d) => d !== day)
      : [...filters.selectedDays, day];
    updateFilter('selectedDays', days);
  };

  const setPriceRange = (min: number, max: number) => {
    updateFilter('priceMin', min);
    updateFilter('priceMax', max);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-5 mb-4 max-h-[75vh] overflow-y-auto"
    >
      {/* Header with reset */}
      {hasAny && (
        <div className="flex justify-end mb-3">
          <button
            onClick={resetFilters}
            className="text-xs text-gray-400 hover:text-primary-500 flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={11} /> Reset filtri
          </button>
        </div>
      )}

      {/* Category */}
      <div className="mb-5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
          Tipo di servizio
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.key}
              onClick={() => { updateFilter('category', cat.key); updateFilter('selectedService', ''); }}
              className={clsx(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-medium transition-all',
                filters.category === cat.key
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/20'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100',
              )}
            >
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Specific service */}
      {serviceOptions.length > 0 && (
        <div className="mb-5">
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

      {/* Days — multi-select */}
      <div className="mb-5">
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

      {/* Time range — from / to */}
      <div className="mb-5">
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
                updateFilter('timeFrom', v);
                if (v && filters.timeTo && v >= filters.timeTo) updateFilter('timeTo', '');
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
                updateFilter('timeTo', v);
                if (v && filters.timeFrom && v <= filters.timeFrom) updateFilter('timeFrom', '');
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
      <div className="mb-5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
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
      <div className="mb-5">
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
      <div className="mb-5">
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
      <div className="mb-5">
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

      {/* Toggles: Verified + Immediately available */}
      <div className="mb-5 grid grid-cols-2 gap-2">
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

      {/* Apply button */}
      <button
        onClick={onApply}
        className="w-full btn-primary flex items-center justify-center gap-2 py-3 sticky bottom-0"
      >
        <Check size={18} />
        Mostra risultati ({resultCount})
      </button>
    </motion.div>
  );
}

// ─── Active Filters Summary ───

function ActiveFilters({ filters }: { filters: Filters }) {
  const parts: string[] = [];
  if (filters.category) {
    const cat = CATEGORY_FILTERS.find((c) => c.key === filters.category);
    parts.push(cat ? `${cat.icon} ${cat.label}` : filters.category);
  }
  if (filters.selectedService) parts.push(filters.selectedService);
  if (filters.selectedDays.length > 0) {
    const dayLabels = filters.selectedDays.map((d) => DAY_BUTTONS.find((b) => b.value === d)?.label).filter(Boolean);
    parts.push(dayLabels.join(', '));
  }
  if (filters.timeFrom || filters.timeTo) {
    parts.push(`${filters.timeFrom || '...'} - ${filters.timeTo || '...'}`);
  }
  if (filters.priceMin > 0 || filters.priceMax < 999) {
    const p = PRICE_OPTIONS.find((o) => o.min === filters.priceMin && o.max === filters.priceMax);
    parts.push(p?.label || `€${filters.priceMin}-${filters.priceMax}`);
  }
  if (filters.maxDistance > 0) parts.push(`< ${filters.maxDistance} km`);
  if (filters.minRating > 0) parts.push(`${filters.minRating}+`);
  if (filters.selectedLanguage) parts.push(filters.selectedLanguage);
  if (filters.verifiedOnly) parts.push('Verificato');
  if (filters.immediatelyAvailable) parts.push('Disponibile ora');

  if (parts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {parts.map((p, i) => (
        <span key={i} className="text-[11px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-medium">
          {p}
        </span>
      ))}
    </div>
  );
}

// ─── Main Page ───

export default function SwipePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Filter state
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  // Swipe state
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try { return JSON.parse(localStorage.getItem('stu_liked_pros') || '[]'); } catch { return []; }
    }
    return [];
  });
  const [lastLikedPro, setLastLikedPro] = useState<any>(null);

  // Persist likes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('stu_liked_pros', JSON.stringify(liked));
    }
  }, [liked]);

  // Auto-dismiss toast after 3.5s
  useEffect(() => {
    if (lastLikedPro) {
      const timer = setTimeout(() => setLastLikedPro(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [lastLikedPro]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  // Apply filters and load
  const applyFilters = useCallback(() => {
    let pros = applyAllFilters(MOCK_SWIPE_PROFESSIONALS, filters);

    // Shuffle
    for (let i = pros.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pros[i], pros[j]] = [pros[j], pros[i]];
    }

    setProfessionals(pros);
    setCurrentIndex(0);
    setShowFilters(false);
  }, [filters]);

  // Count results for filter preview
  const getFilteredCount = useCallback(() => {
    return applyAllFilters(MOCK_SWIPE_PROFESSIONALS, filters).length;
  }, [filters]);

  // Load initially
  useEffect(() => {
    applyFilters();
  }, []);

  const handleSwipeLeft = useCallback(() => {
    setCurrentIndex((i) => i + 1);
  }, []);

  const handleSwipeRight = useCallback(() => {
    const pro = professionals[currentIndex];
    if (pro) {
      setLiked((prev) => prev.includes(pro.profileId) ? prev : [...prev, pro.profileId]);
      setLastLikedPro(pro);
    }
    setCurrentIndex((i) => i + 1);
  }, [currentIndex, professionals]);

  const handleTap = useCallback(() => {
    const pro = professionals[currentIndex];
    if (pro) router.push(`/professional/${pro.profileId}`);
  }, [currentIndex, professionals, router]);

  const handleRestart = () => {
    applyFilters();
  };

  if (authLoading || !user) return <PageLoading />;

  const currentPro = professionals[currentIndex];
  const nextPro = professionals[currentIndex + 1];
  const isFinished = currentIndex >= professionals.length;
  const progress = professionals.length > 0 ? Math.min(currentIndex / professionals.length, 1) : 0;
  const hasActiveFilters = isFilterActive(filters);

  return (
    <div className="animate-fade-up min-h-screen bg-gray-50/80">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-5 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles size={20} className="text-primary-500" />
                Discover
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {professionals.length} professionisti{hasActiveFilters ? ' (filtrati)' : ''}
              </p>
              <ActiveFilters filters={filters} />
            </div>
            <div className="flex items-center gap-2">
              {liked.length > 0 && (
                <button
                  onClick={() => router.push('/favorites')}
                  className="flex items-center gap-1.5 bg-rose-50 text-rose-500 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-rose-100 active:scale-95 transition-all"
                >
                  <Heart size={14} fill="currentColor" /> {liked.length}
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={clsx(
                  'p-2.5 rounded-xl transition-all relative',
                  showFilters ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-500',
                )}
              >
                <SlidersHorizontal size={18} />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border-2 border-white" />
                )}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {!showFilters && (
            <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-5 pt-4 pb-32">
        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <FilterPanel
              filters={filters}
              updateFilter={updateFilter}
              resetFilters={resetFilters}
              onApply={applyFilters}
              resultCount={getFilteredCount()}
            />
          )}
        </AnimatePresence>

        {/* Swipe area */}
        {!showFilters && (
          <>
            {professionals.length === 0 ? (
              /* No results */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                  <span className="text-5xl">🔍</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Nessun risultato</h2>
                <p className="text-gray-400 text-center max-w-xs mb-6">
                  Prova a modificare i filtri per trovare più professionisti
                </p>
                <button
                  onClick={() => setShowFilters(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <SlidersHorizontal size={16} /> Modifica filtri
                </button>
              </motion.div>
            ) : isFinished ? (
              /* Finished state */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-orange-100 flex items-center justify-center mb-6">
                  <span className="text-5xl">🎉</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Hai visto tutti!</h2>
                <p className="text-gray-400 text-center max-w-xs mb-2">
                  {liked.length > 0
                    ? `Hai messo like a ${liked.length} professionista${liked.length > 1 ? 'i' : ''}!`
                    : 'Nessun like per ora. Prova altri filtri!'}
                </p>
                <div className="flex flex-col items-center gap-3 mt-6 w-full max-w-xs">
                  {liked.length > 0 && (
                    <button
                      onClick={() => router.push('/favorites')}
                      className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-200 active:scale-[0.98] transition-transform"
                    >
                      <Heart size={18} fill="white" /> Vedi i tuoi preferiti ({liked.length})
                    </button>
                  )}
                  <div className="flex gap-3">
                    <button onClick={handleRestart} className="btn-secondary flex items-center gap-2">
                      <RotateCcw size={16} /> Ricomincia
                    </button>
                    <button onClick={() => setShowFilters(true)} className="btn-primary flex items-center gap-2">
                      <SlidersHorizontal size={16} /> Filtri
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Card stack */
              <div className="relative h-[62vh] max-h-[560px]">
                <AnimatePresence>
                  {nextPro && (
                    <SwipeCardEnhanced
                      key={nextPro.profileId + '-bg'}
                      professional={nextPro}
                      onSwipeLeft={() => {}}
                      onSwipeRight={() => {}}
                      onTap={() => {}}
                      isTop={false}
                    />
                  )}
                  {currentPro && (
                    <SwipeCardEnhanced
                      key={currentPro.profileId}
                      professional={currentPro}
                      onSwipeLeft={handleSwipeLeft}
                      onSwipeRight={handleSwipeRight}
                      onTap={handleTap}
                      isTop={true}
                    />
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Action buttons */}
            {!isFinished && professionals.length > 0 && (
              <div className="flex justify-center items-center gap-5 mt-5">
                <button
                  onClick={handleSwipeLeft}
                  className="w-16 h-16 rounded-full bg-white shadow-lg shadow-red-100 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-500 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all border border-red-100"
                >
                  <X size={30} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setShowFilters(true)}
                  className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-gray-400 hover:bg-gray-50 active:scale-95 transition-all border border-gray-100"
                >
                  <SlidersHorizontal size={18} />
                </button>
                <button
                  onClick={handleSwipeRight}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-200 flex items-center justify-center text-white hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all"
                >
                  <Heart size={30} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Like Toast */}
      <AnimatePresence>
        {lastLikedPro && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed bottom-28 left-4 right-4 z-50 max-w-lg mx-auto"
          >
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-300/40 border border-gray-100 p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-emerald-200">
                <Avatar src={lastLikedPro.avatarUrl} name={`${lastLikedPro.firstName} ${lastLikedPro.lastName}`} size="md" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  <span className="text-emerald-500">✓</span> Like a {lastLikedPro.firstName}!
                </p>
                <p className="text-[11px] text-gray-400 truncate">{lastLikedPro.services?.[0]} · €{lastLikedPro.hourlyRate}/h</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setLastLikedPro(null);
                    router.push(`/messages/new-${lastLikedPro.profileId}`);
                  }}
                  className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center hover:bg-primary-100 active:scale-95 transition-all"
                  title="Contatta"
                >
                  <MessageCircle size={16} />
                </button>
                <button
                  onClick={() => {
                    setLastLikedPro(null);
                    router.push(`/professional/${lastLikedPro.profileId}`);
                  }}
                  className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"
                  title="Vedi profilo"
                >
                  <User size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
