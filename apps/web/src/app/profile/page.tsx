'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Avatar } from '@/components/avatar';
import { PageLoading } from '@/components/loading-spinner';
import { LogOut, ChevronRight, User, Briefcase, Calendar, MapPin } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [proProfile, setProProfile] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === 'PROFESSIONAL') {
      api.getMyProfessionalProfile().then(setProProfile).catch(() => {});
    }
  }, [user]);

  if (loading || !user) return <PageLoading />;

  const isPro = user.role === 'PROFESSIONAL';

  return (
    <div className="page-container pt-8">
      {/* Profile header */}
      <div className="card p-6 text-center mb-4">
        <Avatar
          src={user.avatarUrl}
          name={`${user.firstName} ${user.lastName}`}
          size="xl"
        />
        <h1 className="text-xl font-bold mt-3">
          {user.firstName} {user.lastName}
        </h1>
        <p className="text-sm text-gray-400">{user.email}</p>
        <span className="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full bg-primary-50 text-primary-700">
          {isPro ? 'Professional' : 'Client'}
        </span>
      </div>

      {/* Menu items */}
      <div className="space-y-2">
        <button
          onClick={() => router.push('/profile/edit')}
          className="card w-full p-4 flex items-center gap-3 text-left"
        >
          <User size={20} className="text-gray-400" />
          <span className="flex-1 font-medium">Edit Profile</span>
          <ChevronRight size={18} className="text-gray-300" />
        </button>

        {isPro && (
          <>
            <button
              onClick={() => router.push('/profile/services')}
              className="card w-full p-4 flex items-center gap-3 text-left"
            >
              <Briefcase size={20} className="text-gray-400" />
              <div className="flex-1">
                <span className="font-medium">My Services</span>
                {proProfile && (
                  <p className="text-xs text-gray-400">
                    {proProfile.services?.length || 0} services listed
                  </p>
                )}
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>

            <button
              onClick={() => router.push('/profile/availability')}
              className="card w-full p-4 flex items-center gap-3 text-left"
            >
              <Calendar size={20} className="text-gray-400" />
              <div className="flex-1">
                <span className="font-medium">Availability</span>
                {proProfile && (
                  <p className="text-xs text-gray-400">
                    {proProfile.availability?.length || 0} time slots
                  </p>
                )}
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
          </>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={() => {
          logout();
          router.push('/login');
        }}
        className="flex items-center gap-2 text-red-500 font-medium mt-8 mx-auto"
      >
        <LogOut size={18} />
        Sign Out
      </button>
    </div>
  );
}
