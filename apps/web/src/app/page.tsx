'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageLoading } from '@/components/loading-spinner';
import { MapPin, ChevronRight } from 'lucide-react';
import { getCurrentPosition } from '@/lib/geolocation';
import { api } from '@/lib/api';

const CATEGORIES = [
  { key: 'TUTORING', label: 'Private Tutoring', icon: '📚', color: 'bg-blue-50 border-blue-200' },
  { key: 'CLEANING', label: 'Cleaning', icon: '🧹', color: 'bg-green-50 border-green-200' },
  { key: 'PERSONAL_CARE', label: 'Personal Care', icon: '💆', color: 'bg-pink-50 border-pink-200' },
  { key: 'BABYSITTING', label: 'Babysitting', icon: '👶', color: 'bg-yellow-50 border-yellow-200' },
  { key: 'PET_SITTING', label: 'Pet Sitting', icon: '🐾', color: 'bg-purple-50 border-purple-200' },
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

      {/* Categories */}
      <div className="space-y-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => router.push(`/search?category=${cat.key}`)}
            className={`card w-full p-4 flex items-center gap-4 text-left border ${cat.color} hover:shadow-md transition-shadow`}
          >
            <span className="text-3xl">{cat.icon}</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{cat.label}</p>
            </div>
            <ChevronRight className="text-gray-400" size={20} />
          </button>
        ))}
      </div>
    </div>
  );
}
