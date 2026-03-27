'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageLoading } from '@/components/loading-spinner';
import { MapPin, ChevronRight, Search, Star, ArrowRight, Flame, Clock } from 'lucide-react';
import { getCurrentPosition } from '@/lib/geolocation';
import { api } from '@/lib/api';
import { MOCK_JOB_LISTINGS } from '@/lib/mock-data';

const CATEGORIES = [
  { key: 'TUTORING', label: 'Tutoring', icon: '📚', gradient: 'from-orange-400 to-amber-300' },
  { key: 'CLEANING', label: 'Cleaning', icon: '✨', gradient: 'from-emerald-400 to-teal-300' },
  { key: 'PERSONAL_CARE', label: 'Personal Care', icon: '💆', gradient: 'from-rose-400 to-pink-300' },
  { key: 'BABYSITTING', label: 'Babysitting', icon: '👶', gradient: 'from-violet-400 to-purple-300' },
  { key: 'PET_SITTING', label: 'Pet Sitting', icon: '🐾', gradient: 'from-sky-400 to-cyan-300' },
];

const QUICK_SERVICES = [
  { id: 'home-cleaning', label: 'Home Cleaning', icon: '🧹', category: 'CLEANING' },
  { id: 'math-tutoring', label: 'Math Tutor', icon: '📐', category: 'TUTORING' },
  { id: 'babysitting', label: 'Babysitter', icon: '👶', category: 'BABYSITTING' },
  { id: 'dog-walking', label: 'Dog Walking', icon: '🐕', category: 'PET_SITTING' },
];

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied'>('pending');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      getCurrentPosition()
        .then((pos) => {
          api.updateLocation(pos.latitude, pos.longitude);
          setLocationStatus('granted');
        })
        .catch(() => setLocationStatus('denied'));
    }
  }, [user]);

  if (loading || !user) return <PageLoading />;

  // Professional landing
  if (user.role === 'PROFESSIONAL') {
    return (
      <div className="animate-fade-up">
        {/* Pro Hero */}
        <div className="gradient-hero px-5 pt-14 pb-10 rounded-b-[2.5rem]">
          <div className="max-w-lg mx-auto">
            <p className="text-white/80 text-sm font-medium">Welcome back</p>
            <h1 className="text-3xl font-bold text-white mt-1">
              {user.firstName} 👋
            </h1>
            <p className="text-white/70 text-sm mt-2">Manage your services and bookings</p>
          </div>
        </div>

        <div className="page-container -mt-6">
          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="card-elevated w-full p-5 flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-100 to-orange-100 flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Incoming Requests</p>
                  <p className="text-sm text-gray-500">View and manage bookings</p>
                </div>
              </div>
              <ChevronRight className="text-gray-300 group-hover:text-primary-500 transition-colors" />
            </button>

            <button
              onClick={() => router.push('/profile')}
              className="card-elevated w-full p-5 flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">My Profile</p>
                  <p className="text-sm text-gray-500">Edit services, rates & availability</p>
                </div>
              </div>
              <ChevronRight className="text-gray-300 group-hover:text-primary-500 transition-colors" />
            </button>

            <button
              onClick={() => router.push('/bookings')}
              className="card-elevated w-full p-5 flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Earnings</p>
                  <p className="text-sm text-gray-500">Track your income</p>
                </div>
              </div>
              <ChevronRight className="text-gray-300 group-hover:text-primary-500 transition-colors" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Client landing
  return (
    <div className="animate-fade-up">
      {/* Hero section with gradient */}
      <div className="gradient-hero px-5 pt-14 pb-12 rounded-b-[2.5rem]">
        <div className="max-w-lg mx-auto">
          <p className="text-white/60 text-xs font-bold tracking-widest uppercase mb-4">Service to U</p>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-white/80 text-sm font-medium">Good {getGreeting()}</p>
              <h1 className="text-3xl font-bold text-white mt-1">
                {user.firstName} 👋
              </h1>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-white">
              <MapPin size={12} />
              {locationStatus === 'granted' ? 'Located' : 'No location'}
            </div>
          </div>

          {/* Search bar */}
          <button
            onClick={() => router.push('/search')}
            className="w-full bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-4 flex items-center gap-3 shadow-lg shadow-primary-600/10 hover:bg-white transition-colors"
          >
            <Search size={20} className="text-gray-400" />
            <span className="text-gray-400 text-sm">What service do you need?</span>
          </button>
        </div>
      </div>

      <div className="page-container -mt-4">
        {/* Quick services - horizontal scroll */}
        <div className="mb-8">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5">
            {QUICK_SERVICES.map((svc) => (
              <button
                key={svc.id}
                onClick={() => router.push(`/search?category=${svc.category}`)}
                className="flex flex-col items-center gap-2 min-w-[72px] group"
              >
                <div className="w-16 h-16 rounded-2xl bg-white shadow-md shadow-gray-200/60 flex items-center justify-center group-hover:shadow-lg group-hover:-translate-y-0.5 transition-all duration-200">
                  <span className="text-3xl">{svc.icon}</span>
                </div>
                <span className="text-xs font-medium text-gray-600 text-center leading-tight">{svc.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Browse Categories</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => router.push(`/search?category=${cat.key}`)}
                className="relative overflow-hidden rounded-3xl p-5 flex flex-col items-start gap-3 text-left
                           hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200"
              >
                {/* Gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-[0.12]`} />
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-white/80 shadow-sm flex items-center justify-center mb-1">
                    <span className="text-3xl">{cat.icon}</span>
                  </div>
                  <p className="font-semibold text-gray-800 text-sm">{cat.label}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-gray-400">Explore</span>
                    <ArrowRight size={10} className="text-gray-400" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Latest Job Offers */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Latest Offers</h2>
            <button
              onClick={() => router.push('/jobs')}
              className="text-primary-600 text-sm font-semibold flex items-center gap-1 hover:underline"
            >
              See all <ArrowRight size={14} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
            {MOCK_JOB_LISTINGS.slice(0, 6).map((job) => {
              const ICONS: Record<string, string> = { TUTORING: '📚', CLEANING: '✨', PERSONAL_CARE: '💆', BABYSITTING: '👶', PET_SITTING: '🐾' };
              const timeAgo = getTimeAgo(job.postedAt);
              return (
                <button
                  key={job.id}
                  onClick={() => router.push('/jobs')}
                  className="min-w-[220px] max-w-[220px] card-elevated p-4 text-left flex-shrink-0 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{ICONS[job.category] || '📋'}</span>
                    {job.urgent && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                        <Flame size={10} /> Urgente
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight">{job.title}</p>
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                    <MapPin size={10} /> {job.location}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-bold text-accent-600">
                      {job.budget}{job.budgetType === 'hourly' ? '/h' : ''}
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                      <Clock size={9} /> {timeAgo}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* How it works */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">How it works</h2>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Choose a service', desc: 'Browse categories or search directly', color: 'from-primary-400 to-orange-400' },
              { step: '2', title: 'Pick a professional', desc: 'Compare ratings, prices & availability', color: 'from-violet-400 to-purple-400' },
              { step: '3', title: 'Book & pay safely', desc: 'Secure escrow payment protection', color: 'from-emerald-400 to-teal-400' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-bold text-sm">{item.step}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
