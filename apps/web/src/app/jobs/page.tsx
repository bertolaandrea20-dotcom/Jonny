'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageLoading } from '@/components/loading-spinner';
import { ArrowLeft, MapPin, Clock, Flame, SlidersHorizontal, X, Euro, AlertCircle, Check } from 'lucide-react';
import { MOCK_JOB_LISTINGS } from '@/lib/mock-data';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORY_ICONS: Record<string, string> = {
  TUTORING: '📚', CLEANING: '✨', PERSONAL_CARE: '💆', BABYSITTING: '👶', PET_SITTING: '🐾',
};

const CATEGORY_FILTERS = [
  { key: '', label: 'Tutti', icon: '🔥' },
  { key: 'CLEANING', label: 'Pulizie', icon: '✨' },
  { key: 'TUTORING', label: 'Ripetizioni', icon: '📚' },
  { key: 'BABYSITTING', label: 'Babysitting', icon: '👶' },
  { key: 'PERSONAL_CARE', label: 'Cura personale', icon: '💆' },
  { key: 'PET_SITTING', label: 'Pet Sitting', icon: '🐾' },
];

const BUDGET_RANGES = [
  { label: 'Qualsiasi', min: 0, max: Infinity },
  { label: 'Fino a €20', min: 0, max: 20 },
  { label: '€20 - €50', min: 20, max: 50 },
  { label: '€50 - €100', min: 50, max: 100 },
  { label: 'Oltre €100', min: 100, max: Infinity },
];

const BUDGET_TYPE_FILTERS = [
  { key: '', label: 'Tutti' },
  { key: 'hourly', label: 'A ora' },
  { key: 'fixed', label: 'Prezzo fisso' },
];

const TIME_FILTERS = [
  { key: '', label: 'Qualsiasi' },
  { key: 'recent', label: 'Ultime 24h' },
  { key: 'week', label: 'Ultima settimana' },
];

const SORT_OPTIONS = [
  { key: 'recent', label: 'Più recenti' },
  { key: 'budget_high', label: 'Budget alto → basso' },
  { key: 'budget_low', label: 'Budget basso → alto' },
];

// Location zones extracted from job data
const LOCATION_ZONES = [
  { key: '', label: 'Tutte le città' },
  { key: 'Milano', label: 'Milano' },
  { key: 'Roma', label: 'Roma' },
  { key: 'Torino', label: 'Torino' },
  { key: 'Napoli', label: 'Napoli' },
  { key: 'Firenze', label: 'Firenze' },
  { key: 'Bologna', label: 'Bologna' },
  { key: 'Padova', label: 'Padova' },
  { key: 'Venezia', label: 'Venezia' },
];

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Adesso';
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(hours / 24);
  return `${days}g fa`;
}

export default function JobsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Filters
  const [category, setCategory] = useState('');
  const [budgetRange, setBudgetRange] = useState(0); // index into BUDGET_RANGES
  const [budgetType, setBudgetType] = useState('');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [locationZone, setLocationZone] = useState('');
  const [timeFilter, setTimeFilter] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  // Filtered + sorted results
  const filteredJobs = useMemo(() => {
    let jobs = [...MOCK_JOB_LISTINGS];

    // Category
    if (category) jobs = jobs.filter((j) => j.category === category);

    // Budget range
    const range = BUDGET_RANGES[budgetRange];
    if (range.max !== Infinity || range.min > 0) {
      jobs = jobs.filter((j) => j.budget >= range.min && j.budget <= range.max);
    }

    // Budget type
    if (budgetType) jobs = jobs.filter((j) => j.budgetType === budgetType);

    // Urgent only
    if (urgentOnly) jobs = jobs.filter((j) => j.urgent);

    // Location
    if (locationZone) jobs = jobs.filter((j) => j.location.includes(locationZone));

    // Time filter
    if (timeFilter === 'recent') {
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      jobs = jobs.filter((j) => new Date(j.postedAt).getTime() > dayAgo);
    } else if (timeFilter === 'week') {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      jobs = jobs.filter((j) => new Date(j.postedAt).getTime() > weekAgo);
    }

    // Sort
    if (sortBy === 'recent') {
      jobs.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    } else if (sortBy === 'budget_high') {
      jobs.sort((a, b) => b.budget - a.budget);
    } else if (sortBy === 'budget_low') {
      jobs.sort((a, b) => a.budget - b.budget);
    }

    return jobs;
  }, [category, budgetRange, budgetType, urgentOnly, locationZone, timeFilter, sortBy]);

  const hasActiveFilters = !!(category || budgetRange > 0 || budgetType || urgentOnly || locationZone || timeFilter);

  const resetFilters = () => {
    setCategory('');
    setBudgetRange(0);
    setBudgetType('');
    setUrgentOnly(false);
    setLocationZone('');
    setTimeFilter('');
    setSortBy('recent');
  };

  if (loading || !user) return <PageLoading />;

  return (
    <div className="animate-fade-up">
      {/* Hero */}
      <div className="gradient-hero px-5 pt-14 pb-10 rounded-b-[2.5rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => router.back()} className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
              <ArrowLeft size={18} className="text-white" />
            </button>
            <h1 className="text-2xl font-bold text-white flex-1">Offerte di lavoro</h1>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'p-2 rounded-xl transition-colors relative',
                showFilters ? 'bg-white/30' : 'bg-white/20 hover:bg-white/30',
              )}
            >
              <SlidersHorizontal size={18} className="text-white" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-primary-600" />
              )}
            </button>
          </div>
          <p className="text-white/70 text-sm">
            {filteredJobs.length} offert{filteredJobs.length === 1 ? 'a' : 'e'} disponibil{filteredJobs.length === 1 ? 'e' : 'i'}
          </p>
        </div>
      </div>

      <div className="page-container -mt-4">
        {/* Filter Panel */}
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

                {/* Category */}
                <div className="mb-4">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Categoria</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_FILTERS.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setCategory(f.key)}
                        className={clsx(
                          'flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                          category === f.key
                            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-600 border border-gray-100',
                        )}
                      >
                        <span>{f.icon}</span> {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div className="mb-4">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <MapPin size={11} /> Città
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {LOCATION_ZONES.map((z) => (
                      <button
                        key={z.key}
                        onClick={() => setLocationZone(z.key)}
                        className={clsx(
                          'px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                          locationZone === z.key
                            ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-600 border border-gray-100',
                        )}
                      >
                        {z.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget range */}
                <div className="mb-4">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Euro size={11} /> Budget
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {BUDGET_RANGES.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => setBudgetRange(i)}
                        className={clsx(
                          'px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                          budgetRange === i
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-600 border border-gray-100',
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget type */}
                <div className="mb-4">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Tipo compenso</label>
                  <div className="flex gap-1.5">
                    {BUDGET_TYPE_FILTERS.map((bt) => (
                      <button
                        key={bt.key}
                        onClick={() => setBudgetType(bt.key)}
                        className={clsx(
                          'px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                          budgetType === bt.key
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-600 border border-gray-100',
                        )}
                      >
                        {bt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time posted */}
                <div className="mb-4">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Clock size={11} /> Pubblicato
                  </label>
                  <div className="flex gap-1.5">
                    {TIME_FILTERS.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setTimeFilter(t.key)}
                        className={clsx(
                          'px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                          timeFilter === t.key
                            ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-600 border border-gray-100',
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Urgent toggle */}
                <div className="mb-4">
                  <button
                    onClick={() => setUrgentOnly(!urgentOnly)}
                    className={clsx(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all w-full',
                      urgentOnly
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : 'bg-gray-50 text-gray-600 border border-gray-100',
                    )}
                  >
                    <Flame size={16} className={urgentOnly ? 'text-red-500' : 'text-gray-400'} />
                    Solo urgenti
                    {urgentOnly && <Check size={16} className="ml-auto" />}
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
                  <Check size={16} /> Mostra {filteredJobs.length} risultat{filteredJobs.length === 1 ? 'o' : 'i'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active filter pills (when panel closed) */}
        {!showFilters && hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {category && (
              <span className="text-xs bg-primary-50 text-primary-600 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                {CATEGORY_ICONS[category]} {CATEGORY_FILTERS.find((c) => c.key === category)?.label}
                <button onClick={() => setCategory('')}><X size={10} /></button>
              </span>
            )}
            {locationZone && (
              <span className="text-xs bg-violet-50 text-violet-600 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <MapPin size={10} /> {locationZone}
                <button onClick={() => setLocationZone('')}><X size={10} /></button>
              </span>
            )}
            {budgetRange > 0 && (
              <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                {BUDGET_RANGES[budgetRange].label}
                <button onClick={() => setBudgetRange(0)}><X size={10} /></button>
              </span>
            )}
            {budgetType && (
              <span className="text-xs bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                {BUDGET_TYPE_FILTERS.find((b) => b.key === budgetType)?.label}
                <button onClick={() => setBudgetType('')}><X size={10} /></button>
              </span>
            )}
            {urgentOnly && (
              <span className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <Flame size={10} /> Urgenti
                <button onClick={() => setUrgentOnly(false)}><X size={10} /></button>
              </span>
            )}
            {timeFilter && (
              <span className="text-xs bg-sky-50 text-sky-600 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <Clock size={10} /> {TIME_FILTERS.find((t) => t.key === timeFilter)?.label}
                <button onClick={() => setTimeFilter('')}><X size={10} /></button>
              </span>
            )}
          </div>
        )}

        {/* Quick category pills (when no filters panel) */}
        {!showFilters && !hasActiveFilters && (
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-5 px-5 scrollbar-hide">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setCategory(f.key)}
                className={clsx(
                  'flex-shrink-0 flex items-center gap-1 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200',
                  category === f.key
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/20'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100 shadow-sm',
                )}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Results count */}
        <p className="text-sm text-gray-400 mb-3">
          {filteredJobs.length} offert{filteredJobs.length === 1 ? 'a' : 'e'}
          {hasActiveFilters ? ' (filtrate)' : ''}
        </p>

        {/* Listings */}
        {filteredJobs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📋</span>
            </div>
            <p className="text-gray-700 font-semibold">Nessuna offerta trovata</p>
            <p className="text-gray-400 text-sm mt-1">Prova a modificare i filtri</p>
            <button onClick={resetFilters} className="btn-secondary mt-4 text-sm">
              Resetta filtri
            </button>
          </div>
        ) : (
          <div className="space-y-3 pb-24">
            {filteredJobs.map((job) => (
              <div key={job.id} className="card-elevated p-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">{CATEGORY_ICONS[job.category] || '📋'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm text-gray-900 leading-tight">{job.title}</h3>
                      {job.urgent && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 flex-shrink-0">
                          <Flame size={10} /> Urgente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{job.description}</p>
                    <div className="flex items-center gap-3 mt-2.5">
                      <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                        <MapPin size={10} /> {job.location}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={10} /> {getTimeAgo(job.postedAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-accent-600">
                          €{job.budget}{job.budgetType === 'hourly' ? '/h' : ''}
                        </span>
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                          {job.budgetType === 'hourly' ? 'A ora' : 'Fisso'}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        di {job.postedBy}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
