'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageLoading } from '@/components/loading-spinner';
import { Avatar } from '@/components/avatar';
import { StarRating } from '@/components/star-rating';
import { formatDistance } from '@/lib/geolocation';
import { MOCK_SWIPE_PROFESSIONALS } from '@/lib/mock-data';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { MapPin, X, Heart, Star, Shield, RotateCcw, Sparkles, Filter, ChevronDown, Briefcase } from 'lucide-react';
import { clsx } from 'clsx';

const CATEGORY_FILTERS = [
  { key: '', label: 'Tutti', icon: '🔥' },
  { key: 'CLEANING', label: 'Pulizie', icon: '✨' },
  { key: 'TUTORING', label: 'Ripetizioni', icon: '📚' },
  { key: 'BABYSITTING', label: 'Babysitting', icon: '👶' },
  { key: 'PERSONAL_CARE', label: 'Cura personale', icon: '💆' },
  { key: 'PET_SITTING', label: 'Pet Sitting', icon: '🐾' },
];

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
    if (info.offset.x > 120) {
      onSwipeRight();
    } else if (info.offset.x < -120) {
      onSwipeLeft();
    }
  };

  const CATEGORY_COLORS: Record<string, string> = {
    CLEANING: 'from-emerald-400 to-teal-500',
    TUTORING: 'from-orange-400 to-amber-500',
    BABYSITTING: 'from-violet-400 to-purple-500',
    PERSONAL_CARE: 'from-rose-400 to-pink-500',
    PET_SITTING: 'from-sky-400 to-cyan-500',
  };

  const gradientClass = CATEGORY_COLORS[p.category] || 'from-primary-400 to-primary-600';

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
        <div className={`relative bg-gradient-to-br ${gradientClass} pt-10 pb-16 flex flex-col items-center`}>
          <div className="absolute inset-0 bg-white/5" />
          <div className="relative z-10">
            <div className="w-28 h-28 rounded-full border-4 border-white/40 shadow-lg overflow-hidden flex items-center justify-center bg-white/20">
              <Avatar
                src={p.avatarUrl}
                name={`${p.firstName} ${p.lastName}`}
                size="xl"
              />
            </div>
            {p.verified && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                <Shield size={16} className="text-green-500" />
              </div>
            )}
          </div>
        </div>

        {/* Info body */}
        <div className="flex-1 px-6 -mt-8 relative z-10 overflow-y-auto">
          {/* Name card overlapping the gradient */}
          <div className="bg-white rounded-2xl shadow-md shadow-gray-200/60 p-5 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {p.firstName}, <span className="font-normal text-gray-400">{p.age}</span>
                </h2>
                <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-1">
                  <MapPin size={14} />
                  {formatDistance(p.distance)} da te
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-primary-600">{p.hourlyRate}/h</span>
                <div className="mt-1">
                  <StarRating rating={p.averageRating} count={p.reviewCount} size={14} />
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          {p.bio && (
            <p className="text-sm text-gray-600 leading-relaxed mb-4">{p.bio}</p>
          )}

          {/* Services tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {p.services.map((s: string) => (
              <span key={s} className="text-xs font-medium bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function SwipePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    loadProfessionals(filter);
  }, [filter]);

  const loadProfessionals = (category: string) => {
    let pros = [...MOCK_SWIPE_PROFESSIONALS];
    if (category) {
      pros = pros.filter((p) => p.category === category);
    }
    // Shuffle
    for (let i = pros.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pros[i], pros[j]] = [pros[j], pros[i]];
    }
    setProfessionals(pros);
    setCurrentIndex(0);
  };

  const handleSwipeLeft = useCallback(() => {
    setDirection('left');
    setCurrentIndex((i) => i + 1);
  }, []);

  const handleSwipeRight = useCallback(() => {
    const pro = professionals[currentIndex];
    if (pro) {
      setLiked((prev) => [...prev, pro.profileId]);
    }
    setDirection('right');
    setCurrentIndex((i) => i + 1);
  }, [currentIndex, professionals]);

  const handleTap = useCallback(() => {
    const pro = professionals[currentIndex];
    if (pro) {
      router.push(`/professional/${pro.profileId}`);
    }
  }, [currentIndex, professionals, router]);

  const handleRestart = () => {
    loadProfessionals(filter);
    setLiked([]);
  };

  if (authLoading || !user) return <PageLoading />;

  const currentPro = professionals[currentIndex];
  const nextPro = professionals[currentIndex + 1];
  const isFinished = currentIndex >= professionals.length;
  const progress = professionals.length > 0 ? Math.min(currentIndex / professionals.length, 1) : 0;

  return (
    <div className="animate-fade-up min-h-screen bg-gray-50/80">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles size={20} className="text-primary-500" />
                Discover
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {professionals.length} professionisti disponibili
              </p>
            </div>
            <div className="flex items-center gap-2">
              {liked.length > 0 && (
                <button
                  onClick={() => {/* could navigate to a liked list */}}
                  className="flex items-center gap-1.5 bg-rose-50 text-rose-500 px-3 py-2 rounded-xl text-sm font-semibold"
                >
                  <Heart size={14} fill="currentColor" /> {liked.length}
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={clsx(
                  'p-2.5 rounded-xl transition-all',
                  showFilters ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-500',
                )}
              >
                <Filter size={18} />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Filter pills */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-gray-50"
            >
              <div className="max-w-lg mx-auto px-5 py-3">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {CATEGORY_FILTERS.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => { setFilter(cat.key); setShowFilters(false); }}
                      className={clsx(
                        'flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-medium transition-all',
                        filter === cat.key
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/20'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                      )}
                    >
                      <span>{cat.icon}</span> {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Swipe area */}
      <div className="max-w-lg mx-auto px-5 pt-4 pb-32">
        {isFinished ? (
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
                : 'Nessun like per ora. Prova con un\u0027altra categoria!'}
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={handleRestart} className="btn-secondary flex items-center gap-2">
                <RotateCcw size={16} /> Ricomincia
              </button>
              <button onClick={() => router.push('/search')} className="btn-primary flex items-center gap-2">
                <Briefcase size={16} /> Cerca
              </button>
            </div>
          </motion.div>
        ) : (
          /* Card stack */
          <div className="relative h-[68vh] max-h-[600px]">
            <AnimatePresence>
              {/* Background card (next) */}
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
              {/* Top card */}
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
        {!isFinished && (
          <div className="flex justify-center items-center gap-5 mt-6">
            <button
              onClick={handleSwipeLeft}
              className="w-16 h-16 rounded-full bg-white shadow-lg shadow-red-100 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-500 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all border border-red-100"
            >
              <X size={30} strokeWidth={2.5} />
            </button>
            <button
              onClick={handleRestart}
              className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-amber-400 hover:bg-amber-50 active:scale-95 transition-all border border-amber-100"
            >
              <RotateCcw size={20} />
            </button>
            <button
              onClick={handleSwipeRight}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-200 flex items-center justify-center text-white hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all"
            >
              <Heart size={30} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
