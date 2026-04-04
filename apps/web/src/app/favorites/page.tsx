'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageLoading } from '@/components/loading-spinner';
import { Avatar } from '@/components/avatar';
import { StarRating } from '@/components/star-rating';
import { MOCK_SWIPE_PROFESSIONALS } from '@/lib/mock-data';
import { ArrowLeft, Heart, MessageCircle, CalendarPlus, X, MapPin, Sparkles, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORY_LABELS: Record<string, string> = {
  CLEANING: '✨ Pulizie',
  TUTORING: '📚 Ripetizioni',
  BABYSITTING: '👶 Babysitting',
  PERSONAL_CARE: '💆 Cura personale',
  PET_SITTING: '🐾 Pet Sitting',
};

export default function FavoritesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        setLikedIds(JSON.parse(localStorage.getItem('stu_liked_pros') || '[]'));
      } catch {
        setLikedIds([]);
      }
    }
  }, []);

  const removeLike = (profileId: string) => {
    setRemovingId(profileId);
    setTimeout(() => {
      const updated = likedIds.filter((id) => id !== profileId);
      setLikedIds(updated);
      localStorage.setItem('stu_liked_pros', JSON.stringify(updated));
      setRemovingId(null);
    }, 300);
  };

  if (loading || !user) return <PageLoading />;

  const likedPros = likedIds
    .map((id) => MOCK_SWIPE_PROFESSIONALS.find((p) => p.profileId === id))
    .filter(Boolean);

  return (
    <div className="animate-fade-up min-h-screen bg-gray-50/80 pb-28">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-5 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-500 hover:text-gray-700">
              <ArrowLeft size={22} />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Heart size={20} className="text-rose-500" fill="currentColor" />
                I miei preferiti
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {likedPros.length} professionista{likedPros.length !== 1 ? 'i' : ''} salvat{likedPros.length !== 1 ? 'i' : 'o'}
              </p>
            </div>
            <button
              onClick={() => router.push('/swipe')}
              className="flex items-center gap-1.5 bg-primary-50 text-primary-600 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-primary-100 active:scale-95 transition-all"
            >
              <Sparkles size={14} /> Discover
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-4">
        {likedPros.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-24 h-24 rounded-full bg-rose-50 flex items-center justify-center mb-6">
              <Heart size={40} className="text-rose-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Nessun preferito</h2>
            <p className="text-gray-400 text-center max-w-xs mb-6">
              Non hai ancora messo like a nessun professionista. Vai su Discover e inizia a swipare!
            </p>
            <button
              onClick={() => router.push('/swipe')}
              className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-rose-200 active:scale-[0.98] transition-transform"
            >
              <Sparkles size={18} /> Vai a Discover
            </button>
          </motion.div>
        ) : (
          /* Favorites list */
          <div className="space-y-3">
            <AnimatePresence>
              {likedPros.map((pro: any, idx: number) => (
                <motion.div
                  key={pro.profileId}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: removingId === pro.profileId ? 0 : 1, x: removingId === pro.profileId ? -200 : 0 }}
                  exit={{ opacity: 0, x: -200, height: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  {/* Card content */}
                  <div
                    className="p-4 flex items-center gap-3 cursor-pointer"
                    onClick={() => router.push(`/professional/${pro.profileId}`)}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-100">
                        <Avatar src={pro.avatarUrl} name={`${pro.firstName} ${pro.lastName}`} size="lg" />
                      </div>
                      {pro.verified && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <Shield size={10} className="text-green-500" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-900 truncate">
                          {pro.firstName} {pro.lastName}
                        </h3>
                        <span className="text-xs font-bold text-primary-600">€{pro.hourlyRate}/h</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {CATEGORY_LABELS[pro.category] || pro.category}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <StarRating rating={pro.averageRating} count={pro.reviewCount} size={11} />
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <MapPin size={9} /> {pro.distance} km
                        </span>
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeLike(pro.profileId); }}
                      className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-400 active:scale-90 transition-all flex-shrink-0"
                      title="Rimuovi"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex border-t border-gray-50">
                    <button
                      onClick={() => router.push(`/messages/new-${pro.profileId}`)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors"
                    >
                      <MessageCircle size={16} /> Contatta
                    </button>
                    <div className="w-px bg-gray-50" />
                    <button
                      onClick={() => router.push(`/professional/${pro.profileId}`)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                      <CalendarPlus size={16} /> Prenota
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
