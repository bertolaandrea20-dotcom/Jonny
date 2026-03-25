'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { PageLoading } from '@/components/loading-spinner';
import {
  DollarSign, CheckCircle, Clock, XCircle, TrendingUp,
  CreditCard, Shield, ArrowRight,
} from 'lucide-react';
import { clsx } from 'clsx';

const TX_STATUS_STYLES: Record<string, string> = {
  HELD: 'bg-blue-50 text-blue-600',
  RELEASED: 'bg-green-50 text-green-600',
  REFUNDED: 'bg-gray-100 text-gray-500',
  PENDING: 'bg-yellow-50 text-yellow-600',
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [earnings, setEarnings] = useState<any>(null);
  const [stripeStatus, setStripeStatus] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

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
      Promise.all([
        api.getProfessionalBookings().catch(() => []),
        api.getEarnings().catch(() => null),
        api.getStripeStatus().catch(() => ({ connected: false, ready: false })),
      ]).then(([bk, earn, stripe]) => {
        setBookings(bk);
        setEarnings(earn);
        setStripeStatus(stripe);
      }).finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const handleConnectStripe = async () => {
    setConnecting(true);
    try {
      const result = await api.connectStripe(window.location.href);
      if (result.demo) {
        setStripeStatus({ connected: true, ready: true, demo: true });
      } else {
        window.location.href = result.url;
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setConnecting(false);
    }
  };

  if (authLoading || loading) return <PageLoading />;
  if (!user) return null;

  const pending = bookings.filter((b) => b.status === 'PENDING').length;
  const accepted = bookings.filter((b) => b.status === 'ACCEPTED').length;
  const completed = bookings.filter((b) => b.status === 'COMPLETED').length;

  return (
    <div className="page-container pt-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stripe Connect Banner */}
      {!stripeStatus?.connected && (
        <div className="card p-4 mb-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <div className="flex items-start gap-3">
            <CreditCard className="text-purple-500 flex-shrink-0 mt-0.5" size={24} />
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Connect your payment account</h3>
              <p className="text-xs text-gray-600 mt-1">
                Connect Stripe to receive payments from clients. Your earnings are held in escrow and released after each service.
              </p>
              <button
                onClick={handleConnectStripe}
                disabled={connecting}
                className="btn-accent text-sm py-2 px-4 mt-3"
              >
                {connecting ? 'Connecting...' : 'Connect Stripe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {stripeStatus?.connected && (
        <div className="card p-3 mb-4 flex items-center gap-2 bg-green-50 border-green-200">
          <CheckCircle size={16} className="text-green-500" />
          <span className="text-sm font-medium text-green-700">
            Stripe connected {stripeStatus.demo ? '(Demo mode)' : ''}
          </span>
        </div>
      )}

      {/* Earnings Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card p-4 text-center">
          <TrendingUp className="mx-auto text-green-500 mb-1" size={24} />
          <p className="text-2xl font-bold">{earnings?.totalEarned?.toFixed(0) || 0}</p>
          <p className="text-xs text-gray-400">Total Earned (EUR)</p>
        </div>
        <div className="card p-4 text-center">
          <Shield className="mx-auto text-blue-500 mb-1" size={24} />
          <p className="text-2xl font-bold">{earnings?.pendingEarnings?.toFixed(0) || 0}</p>
          <p className="text-xs text-gray-400">In Escrow (EUR)</p>
        </div>
        <div className="card p-4 text-center">
          <CheckCircle className="mx-auto text-green-500 mb-1" size={24} />
          <p className="text-2xl font-bold">{completed}</p>
          <p className="text-xs text-gray-400">Completed</p>
        </div>
        <div className="card p-4 text-center">
          <Clock className="mx-auto text-yellow-500 mb-1" size={24} />
          <p className="text-2xl font-bold">{pending + accepted}</p>
          <p className="text-xs text-gray-400">Active</p>
        </div>
      </div>

      {/* Platform fee info */}
      <div className="card p-3 mb-4 flex items-center justify-between">
        <span className="text-xs text-gray-500">Platform commission</span>
        <span className="text-xs font-semibold text-gray-700">{earnings?.platformFeeRate || '15%'}</span>
      </div>

      {/* Recent transactions */}
      {earnings?.recentTransactions?.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Recent Transactions
          </h2>
          <div className="space-y-2">
            {earnings.recentTransactions.map((tx: any) => (
              <div key={tx.bookingId} className="card p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{tx.service}</p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(tx.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">+{tx.netAmount} EUR</p>
                    <p className="text-[10px] text-gray-400">Fee: {tx.fee} EUR</p>
                    <span className={clsx(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                      TX_STATUS_STYLES[tx.status] || 'bg-gray-100',
                    )}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <button
        onClick={() => router.push('/bookings')}
        className="btn-primary w-full mb-3 flex items-center justify-center gap-2"
      >
        View All Requests ({pending + accepted} active)
        <ArrowRight size={16} />
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
