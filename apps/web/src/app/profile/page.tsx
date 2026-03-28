'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Avatar } from '@/components/avatar';
import { PageLoading } from '@/components/loading-spinner';
import {
  LogOut, ChevronRight, User, Briefcase, Calendar,
  MapPin, CreditCard, Camera, X, Award,
  BookOpen, Euro, Heart, CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MOCK_AVATAR_OPTIONS,
  MOCK_USER_STATS,
  MOCK_VERIFICATION,
} from '@/lib/mock-data';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout, refreshUser } = useAuth();
  const [proProfile, setProProfile] = useState<any>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === 'PROFESSIONAL') {
      api.getMyProfessionalProfile().then(setProProfile).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (user?.avatarUrl) setSelectedAvatar(user.avatarUrl);
  }, [user]);

  const handleAvatarSelect = async (url: string) => {
    setSelectedAvatar(url);
    setShowAvatarPicker(false);
    try {
      await api.updateProfile({ avatarUrl: url });
      await refreshUser();
    } catch {}
  };

  if (loading || !user) return <PageLoading />;

  const isPro = user.role === 'PROFESSIONAL';
  const stats = MOCK_USER_STATS;
  const verification = MOCK_VERIFICATION;

  return (
    <div className="animate-fade-up pb-28">
      {/* Profile header with gradient */}
      <div className="gradient-hero-soft px-5 pt-10 pb-8">
        <div className="max-w-lg mx-auto text-center">
          {/* Avatar with camera overlay */}
          <div className="relative inline-block">
            <Avatar
              src={selectedAvatar || user.avatarUrl}
              name={`${user.firstName} ${user.lastName}`}
              size="xl"
            />
            <button
              onClick={() => setShowAvatarPicker(true)}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
            >
              <Camera size={14} className="text-white" />
            </button>
          </div>

          <h1 className="text-xl font-bold mt-4 text-gray-900">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-gray-500">{user.email}</p>

          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white shadow-sm text-primary-600">
              {isPro ? 'Professionista' : 'Cliente'}
            </span>
            {!isPro && (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-sm">
                <Award size={10} className="inline -mt-0.5 mr-1" />
                Livello {stats.level} - {stats.levelName}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="page-container -mt-2">
        {/* Level progress bar (client only) */}
        {!isPro && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-elevated p-4 mb-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progresso livello</span>
              <span className="text-xs text-gray-400">{stats.xp}/{stats.xpToNext} XP</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(stats.xp / stats.xpToNext) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
              />
            </div>
          </motion.div>
        )}

        {/* Quick Stats (client only) */}
        {!isPro && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 mb-4"
          >
            <div className="card-elevated p-3 text-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-1.5">
                <BookOpen size={14} className="text-blue-600" />
              </div>
              <p className="text-lg font-bold text-gray-900">{stats.totalBookings}</p>
              <p className="text-[10px] text-gray-400">Prenotazioni</p>
            </div>
            <div className="card-elevated p-3 text-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-1.5">
                <Euro size={14} className="text-emerald-600" />
              </div>
              <p className="text-lg font-bold text-gray-900">{stats.totalSpent}</p>
              <p className="text-[10px] text-gray-400">Speso totale</p>
            </div>
            <div className="card-elevated p-3 text-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center mx-auto mb-1.5">
                <Heart size={14} className="text-rose-600" />
              </div>
              <p className="text-lg font-bold text-gray-900">{stats.favouritePro.name}</p>
              <p className="text-[10px] text-gray-400">Preferito ({stats.favouritePro.bookings}x)</p>
            </div>
          </motion.div>
        )}

        {/* Badges (client only) */}
        {!isPro && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-elevated p-4 mb-4"
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Badge ottenuti</h3>
            <div className="flex flex-wrap gap-2">
              {stats.badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    badge.earned
                      ? 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border border-amber-200'
                      : 'bg-gray-50 text-gray-300 border border-gray-100'
                  }`}
                  title={badge.description}
                >
                  <span className={badge.earned ? '' : 'grayscale opacity-40'}>{badge.icon}</span>
                  {badge.name}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Identity Verification */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-elevated p-4 mb-4"
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Verifica identità</h3>
          <div className="space-y-2.5">
            {Object.values(verification).map((v) => (
              <div key={v.label} className="flex items-center gap-3">
                <span className="text-lg">{v.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{v.label}</p>
                  <p className="text-xs text-gray-400">{v.detail}</p>
                </div>
                {v.status === 'verified' ? (
                  <CheckCircle2 size={18} className="text-green-500" />
                ) : v.status === 'pending' ? (
                  <Clock size={18} className="text-amber-500" />
                ) : (
                  <AlertCircle size={18} className="text-gray-300" />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Menu items */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          <button
            onClick={() => router.push('/profile/edit')}
            className="card-elevated w-full p-4 flex items-center gap-4 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-orange-100 flex items-center justify-center">
              <User size={18} className="text-primary-600" />
            </div>
            <span className="flex-1 font-medium text-gray-900">Modifica profilo</span>
            <ChevronRight size={18} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
          </button>

          {isPro && (
            <>
              <button
                onClick={() => router.push('/profile/services')}
                className="card-elevated w-full p-4 flex items-center gap-4 text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                  <Briefcase size={18} className="text-violet-600" />
                </div>
                <div className="flex-1">
                  <span className="font-medium text-gray-900">I miei servizi</span>
                  {proProfile && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {proProfile.services?.length || 0} servizi attivi
                    </p>
                  )}
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
              </button>

              <button
                onClick={() => router.push('/profile/availability')}
                className="card-elevated w-full p-4 flex items-center gap-4 text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                  <Calendar size={18} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <span className="font-medium text-gray-900">Disponibilità</span>
                  {proProfile && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {proProfile.availability?.length || 0} fasce orarie
                    </p>
                  )}
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
              </button>
            </>
          )}

          {/* Saved Addresses */}
          <button
            onClick={() => router.push('/profile/addresses')}
            className="card-elevated w-full p-4 flex items-center gap-4 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-100 to-cyan-100 flex items-center justify-center">
              <MapPin size={18} className="text-sky-600" />
            </div>
            <span className="flex-1 font-medium text-gray-900">Indirizzi salvati</span>
            <ChevronRight size={18} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
          </button>

          {/* Payment Methods */}
          <button
            onClick={() => router.push('/profile/payments')}
            className="card-elevated w-full p-4 flex items-center gap-4 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center">
              <CreditCard size={18} className="text-amber-600" />
            </div>
            <span className="flex-1 font-medium text-gray-900">Metodi di pagamento</span>
            <ChevronRight size={18} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
          </button>
        </motion.div>

        {/* Logout */}
        <button
          onClick={() => {
            logout();
            router.push('/login');
          }}
          className="flex items-center gap-2 text-red-500 font-medium mt-8 mx-auto hover:text-red-600 transition-colors"
        >
          <LogOut size={18} />
          Esci
        </button>
      </div>

      {/* Avatar Picker Modal */}
      <AnimatePresence>
        {showAvatarPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            onClick={() => setShowAvatarPicker(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">Scegli foto profilo</h3>
                <button onClick={() => setShowAvatarPicker(false)} className="p-2">
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {MOCK_AVATAR_OPTIONS.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => handleAvatarSelect(url)}
                    className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all ${
                      selectedAvatar === url ? 'border-primary-500 scale-95' : 'border-transparent'
                    }`}
                  >
                    <img src={url} alt={`Avatar ${i + 1}`} className="w-full h-full object-cover" />
                    {selectedAvatar === url && (
                      <div className="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
                        <CheckCircle2 size={24} className="text-white drop-shadow" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
