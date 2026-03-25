'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { PageLoading } from '@/components/loading-spinner';
import { DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (!authLoading && user?.role !== 'PROFESSIONAL') {
      router.push('/');
      return;
    }
    if (user) {
      api.getProfessionalBookings()
        .then(setBookings)
        .catch(() => setBookings([]))
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) return <PageLoading />;
  if (!user) return null;

  const pending = bookings.filter((b) => b.status === 'PENDING').length;
  const accepted = bookings.filter((b) => b.status === 'ACCEPTED').length;
  const completed = bookings.filter((b) => b.status === 'COMPLETED').length;
  const totalEarnings = bookings
    .filter((b) => b.status === 'COMPLETED')
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  return (
    <div className="page-container pt-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card p-4 text-center">
          <DollarSign className="mx-auto text-green-500 mb-1" size={24} />
          <p className="text-2xl font-bold">{totalEarnings.toFixed(0)}</p>
          <p className="text-xs text-gray-400">Total Earnings</p>
        </div>
        <div className="card p-4 text-center">
          <CheckCircle className="mx-auto text-blue-500 mb-1" size={24} />
          <p className="text-2xl font-bold">{completed}</p>
          <p className="text-xs text-gray-400">Completed</p>
        </div>
        <div className="card p-4 text-center">
          <Clock className="mx-auto text-yellow-500 mb-1" size={24} />
          <p className="text-2xl font-bold">{pending}</p>
          <p className="text-xs text-gray-400">Pending</p>
        </div>
        <div className="card p-4 text-center">
          <XCircle className="mx-auto text-purple-500 mb-1" size={24} />
          <p className="text-2xl font-bold">{accepted}</p>
          <p className="text-xs text-gray-400">Accepted</p>
        </div>
      </div>

      {/* Quick actions */}
      <button
        onClick={() => router.push('/bookings')}
        className="btn-primary w-full mb-3"
      >
        View All Requests ({pending + accepted} active)
      </button>
      <button
        onClick={() => router.push('/profile')}
        className="btn-secondary w-full"
      >
        Edit My Profile
      </button>
    </div>
  );
}
