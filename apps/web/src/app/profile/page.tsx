'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Avatar } from '@/components/avatar';
import { PageLoading } from '@/components/loading-spinner';
import { LogOut, ChevronRight, User, Briefcase, Calendar } from 'lucide-react';

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
    <div className="animate-fade-up">
      {/* Profile header with gradient */}
      <div className="gradient-hero-soft px-5 pt-10 pb-8">
        <div className="max-w-lg mx-auto text-center">
          <Avatar
            src={user.avatarUrl}
            name={`${user.firstName} ${user.lastName}`}
            size="xl"
          />
          <h1 className="text-xl font-bold mt-4 text-gray-900">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-gray-500">{user.email}</p>
          <span className="inline-block mt-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-white shadow-sm text-primary-600">
            {isPro ? 'Professional' : 'Client'}
          </span>
        </div>
      </div>

      <div className="page-container -mt-2">
        {/* Menu items */}
        <div className="space-y-2">
          <button
            onClick={() => router.push('/profile/edit')}
            className="card-elevated w-full p-4 flex items-center gap-4 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-orange-100 flex items-center justify-center">
              <User size={18} className="text-primary-600" />
            </div>
            <span className="flex-1 font-medium text-gray-900">Edit Profile</span>
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
                  <span className="font-medium text-gray-900">My Services</span>
                  {proProfile && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {proProfile.services?.length || 0} services listed
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
                  <span className="font-medium text-gray-900">Availability</span>
                  {proProfile && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {proProfile.availability?.length || 0} time slots
                    </p>
                  )}
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
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
          className="flex items-center gap-2 text-red-500 font-medium mt-8 mx-auto hover:text-red-600 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
