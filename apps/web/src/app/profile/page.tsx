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
  TrendingUp, Crown, Lock, Zap, Star, Upload, ShieldCheck, ChevronDown, ChevronUp, MessageSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MOCK_AVATAR_OPTIONS,
  MOCK_USER_STATS,
  MOCK_VERIFICATION,
  MOCK_PREMIUM_INSIGHTS,
  MOCK_VERIFICATION_STEPS,
  MOCK_REVIEWS_RECEIVED_CLIENT,
} from '@/lib/mock-data';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout, refreshUser } = useAuth();
  const [proProfile, setProProfile] = useState<any>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | undefined>(undefined);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showVerificationDetail, setShowVerificationDetail] = useState(false);
  const [verificationSteps, setVerificationSteps] = useState(MOCK_VERIFICATION_STEPS);
  const [uploadingStep, setUploadingStep] = useState<string | null>(null);
  const [showClientReviews, setShowClientReviews] = useState(false);

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

  const handleVerificationUpload = (stepId: string) => {
    setUploadingStep(stepId);
    // Simulate upload + verification
    setTimeout(() => {
      setVerificationSteps((prev) =>
        prev.map((s) => s.id === stepId ? { ...s, status: 'pending' as const, detail: 'In verifica... (1-2 giorni lavorativi)' } : s)
      );
      setUploadingStep(null);
    }, 2000);
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
          <button
            onClick={() => setShowVerificationDetail(!showVerificationDetail)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary-500" />
              <h3 className="text-sm font-semibold text-gray-700">Verifica identità</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                {verificationSteps.filter((s) => s.status === 'completed').length}/{verificationSteps.length}
              </span>
              {showVerificationDetail ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </div>
          </button>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(verificationSteps.filter((s) => s.status === 'completed').length / verificationSteps.length) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500"
            />
          </div>

          <AnimatePresence>
            {showVerificationDetail && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 mt-4">
                  {verificationSteps.map((step, idx) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className={`flex items-start gap-3 p-3 rounded-xl border ${
                        step.status === 'completed' ? 'bg-emerald-50/50 border-emerald-100' :
                        step.status === 'pending' ? 'bg-amber-50/50 border-amber-100' :
                        'bg-gray-50/50 border-gray-100'
                      }`}
                    >
                      <span className="text-lg mt-0.5">{step.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{step.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{step.detail}</p>

                        {/* Action button for not_started steps */}
                        {step.status === 'not_started' && (
                          <button
                            onClick={() => handleVerificationUpload(step.id)}
                            disabled={uploadingStep === step.id}
                            className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors"
                          >
                            {uploadingStep === step.id ? (
                              <>
                                <div className="w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                                Caricamento...
                              </>
                            ) : (
                              <>
                                <Upload size={12} />
                                {step.id === 'step-selfie' ? 'Scatta selfie' : 'Carica documento'}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <div className="flex-shrink-0 mt-1">
                        {step.status === 'completed' ? (
                          <CheckCircle2 size={18} className="text-emerald-500" />
                        ) : step.status === 'pending' ? (
                          <Clock size={18} className="text-amber-500" />
                        ) : step.status === 'rejected' ? (
                          <AlertCircle size={18} className="text-red-500" />
                        ) : (
                          <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-200" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Trust badge info */}
                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-xs text-blue-700 font-medium flex items-center gap-1.5">
                    <ShieldCheck size={13} />
                    Completa la verifica per ottenere il badge "Verificato" sul tuo profilo
                  </p>
                  <p className="text-[11px] text-blue-500 mt-1">
                    I profili verificati ricevono il 35% in più di prenotazioni
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Client Reviews Received (bidirectional) */}
        {!isPro && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="card-elevated p-4 mb-4"
          >
            <button
              onClick={() => setShowClientReviews(!showClientReviews)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-700">Le tue recensioni</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  {MOCK_REVIEWS_RECEIVED_CLIENT.length} ricevute
                </span>
                {showClientReviews ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </button>

            <AnimatePresence>
              {showClientReviews && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <p className="text-xs text-gray-400 mt-3 mb-2">
                    I professionisti possono recensirti dopo ogni servizio completato
                  </p>
                  <div className="space-y-3 mt-2">
                    {MOCK_REVIEWS_RECEIVED_CLIENT.map((review, idx) => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-3 bg-gray-50 rounded-xl"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Avatar src={review.reviewer.avatarUrl} name={`${review.reviewer.firstName} ${review.reviewer.lastName}`} size="sm" />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-gray-800">{review.reviewer.firstName} {review.reviewer.lastName}</p>
                            <p className="text-[10px] text-gray-400">{review.serviceName}</p>
                          </div>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} size={10} className={s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">{review.comment}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Premium Insights (pro only) */}
        {isPro && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                  <Crown size={14} className="text-white" />
                </div>
                <h3 className="text-sm font-bold text-gray-800">Insights Premium</h3>
              </div>
              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {MOCK_PREMIUM_INSIGHTS.city} · {MOCK_PREMIUM_INSIGHTS.categoryLabel}
              </span>
            </div>

            {/* Insight cards - horizontal scroll */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
              {MOCK_PREMIUM_INSIGHTS.insights.map((insight, idx) => {
                const colorMap: Record<string, { bg: string; text: string; highlight: string; border: string }> = {
                  emerald: { bg: 'from-emerald-50 to-teal-50', text: 'text-emerald-700', highlight: 'text-emerald-600', border: 'border-emerald-200' },
                  orange: { bg: 'from-orange-50 to-amber-50', text: 'text-orange-700', highlight: 'text-orange-600', border: 'border-orange-200' },
                  blue: { bg: 'from-blue-50 to-indigo-50', text: 'text-blue-700', highlight: 'text-blue-600', border: 'border-blue-200' },
                  violet: { bg: 'from-violet-50 to-purple-50', text: 'text-violet-700', highlight: 'text-violet-600', border: 'border-violet-200' },
                  rose: { bg: 'from-rose-50 to-pink-50', text: 'text-rose-700', highlight: 'text-rose-600', border: 'border-rose-200' },
                };
                const c = colorMap[insight.color] || colorMap.blue;
                return (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.08 }}
                    className={`flex-shrink-0 w-[260px] snap-start rounded-2xl bg-gradient-to-br ${c.bg} border ${c.border} p-4`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{insight.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-lg font-bold ${c.highlight}`}>{insight.highlight}</span>
                        </div>
                        <p className={`text-xs font-semibold ${c.text} mb-1.5`}>{insight.title}</p>
                        <p className="text-[11px] text-gray-500 leading-relaxed">{insight.description}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* CTA Premium */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={() => setShowPremiumModal(true)}
              className="w-full mt-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-amber-200/50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Crown size={16} />
              Passa a Premium — €{MOCK_PREMIUM_INSIGHTS.premiumPrice}/mese
            </motion.button>
          </motion.div>
        )}

        {/* Menu items */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isPro ? 0.7 : 0.4 }}
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

      {/* Premium Modal */}
      <AnimatePresence>
        {showPremiumModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            onClick={() => setShowPremiumModal(false)}
          >
            <motion.div
              initial={{ y: 400 }}
              animate={{ y: 0 }}
              exit={{ y: 400 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                    <Crown size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Service to U Premium</h3>
                    <p className="text-xs text-gray-400">Fai crescere la tua attività</p>
                  </div>
                </div>
                <button onClick={() => setShowPremiumModal(false)} className="p-2">
                  <X size={20} />
                </button>
              </div>

              {/* Price */}
              <div className="text-center mb-6 p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200">
                <p className="text-4xl font-bold text-gray-900">€{MOCK_PREMIUM_INSIGHTS.premiumPrice}<span className="text-base font-normal text-gray-400">/mese</span></p>
                <p className="text-xs text-gray-500 mt-1">Annulla quando vuoi · Prova gratis 14 giorni</p>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                {MOCK_PREMIUM_INSIGHTS.premiumFeatures.map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={13} className="text-white" />
                    </div>
                    <p className="text-sm text-gray-700">{feature}</p>
                  </motion.div>
                ))}
              </div>

              {/* Key stats recap */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="text-center p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-lg font-bold text-emerald-600">+42%</p>
                  <p className="text-[10px] text-emerald-500">Prenotazioni</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="text-lg font-bold text-blue-600">3.2x</p>
                  <p className="text-[10px] text-blue-500">Visibilità</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-violet-50 border border-violet-100">
                  <p className="text-lg font-bold text-violet-600">+37%</p>
                  <p className="text-[10px] text-violet-500">Guadagno</p>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => {
                  setShowPremiumModal(false);
                  alert('Demo: abbonamento Premium attivato!');
                }}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-white font-bold text-base shadow-lg shadow-amber-200/50 active:scale-[0.98] transition-transform"
              >
                Inizia la prova gratuita
              </button>
              <p className="text-center text-[11px] text-gray-400 mt-2">
                Nessun addebito per 14 giorni · Cancella in qualsiasi momento
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
