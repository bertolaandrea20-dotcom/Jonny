'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageLoading } from '@/components/loading-spinner';
import { MapPin, ChevronRight } from 'lucide-react';
import { getCurrentPosition } from '@/lib/geolocation';
import { api } from '@/lib/api';

const CATEGORIES = [
  { key: 'TUTORING', label: 'Private Tutoring', icon: '📚', bg: 'bg-orange-50', iconBg: 'bg-orange-100' },
  { key: 'CLEANING', label: 'Cleaning', icon: '🧹', bg: 'bg-emerald-50', iconBg: 'bg-emerald-100' },
  { key: 'PERSONAL_CARE', label: 'Personal Care', icon: '💆', bg: 'bg-rose-50', iconBg: 'bg-rose-100' },
  { key: 'BABYSITTING', label: 'Babysitting', icon: '👶', bg: 'bg-amber-50', iconBg: 'bg-amber-100' },
  { key: 'PET_SITTING', label: 'Pet Sitting', icon: '🐾', bg: 'bg-violet-50', iconBg: 'bg-violet-100' },
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
      <div className="page-container pt-12">
        <h1 className="text-2xl font-bold mb-1">
          Welcome, {user.firstName}
        </h1>
        <p className="text-gray-500 mb-8">Manage your professional profile</p>

        <div className="space-y-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="card w-full p-4 flex items-center justify-between text-left"
          >
            <div>
              <p className="font-semibold">Incoming Requests</p>
              <p className="text-sm text-gray-500">View and manage bookings</p>
            </div>
            <ChevronRight className="text-gray-400" />
          </button>

          <button
            onClick={() => router.push('/profile')}
            className="card w-full p-4 flex items-center justify-between text-left"
          >
            <div>
              <p className="font-semibold">My Profile</p>
              <p className="text-sm text-gray-500">Edit services, availability & rates</p>
            </div>
            <ChevronRight className="text-gray-400" />
          </button>
        </div>
      </div>
    );
  }

  // Client landing
  return (
    <div className="page-container pt-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">
            Hi, {user.firstName}
          </h1>
          <p className="text-gray-500 text-sm">What do you need today?</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <MapPin size={14} />
          {locationStatus === 'granted' ? 'Located' : 'No location'}
        </div>
      </div>

      {/* Categories - Glovo-style grid */}
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => router.push(`/search?category=${cat.key}`)}
            className={`${cat.bg} rounded-2xl p-5 flex flex-col items-center gap-3 text-center hover:shadow-md active:scale-[0.97] transition-all duration-150`}
          >
            <div className={`${cat.iconBg} w-16 h-16 rounded-2xl flex items-center justify-center`}>
              <span className="text-4xl">{cat.icon}</span>
            </div>
            <p className="font-semibold text-gray-800 text-sm">{cat.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
