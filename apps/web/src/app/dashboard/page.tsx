'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { PageLoading } from '@/components/loading-spinner';
import {
  DollarSign, CheckCircle, Clock, XCircle, TrendingUp,
  CreditCard, Shield, ArrowRight, Users, Star, BarChart3, PieChart,
} from 'lucide-react';
import { clsx } from 'clsx';
import { MOCK_PRO_STATS } from '@/lib/mock-data';
import { motion } from 'framer-motion';

const TX_STATUS_STYLES: Record<string, string> = {
  HELD: 'bg-blue-50 text-blue-600 border border-blue-100',
  RELEASED: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  REFUNDED: 'bg-gray-50 text-gray-500 border border-gray-100',
  PENDING: 'bg-amber-50 text-amber-600 border border-amber-100',
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
    <div className="animate-fade-up">
      {/* Hero header */}
      <div className="gradient-hero px-5 pt-14 pb-10 rounded-b-[2.5rem]">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-white/70 text-sm mt-1">Your earnings & activity</p>
        </div>
      </div>

      <div className="page-container -mt-6">
        {/* Stripe Connect Banner */}
        {!stripeStatus?.connected && (
          <div className="card-elevated p-5 mb-4 bg-gradient-to-r from-violet-50 to-blue-50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-400 flex items-center justify-center flex-shrink-0">
                <CreditCard className="text-white" size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-gray-900">Connect payments</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Set up Stripe to receive payments from clients securely.
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
          <div className="card-elevated p-3 mb-4 flex items-center gap-2 bg-emerald-50">
            <CheckCircle size={16} className="text-emerald-500" />
            <span className="text-sm font-medium text-emerald-700">
              Stripe connected {stripeStatus.demo ? '(Demo)' : ''}
            </span>
          </div>
        )}

        {/* KPI Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="card-elevated p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="text-white" size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{MOCK_PRO_STATS.totalEarnings.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">Guadagno totale (EUR)</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-sky-400 flex items-center justify-center mx-auto mb-2">
              <BarChart3 className="text-white" size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{MOCK_PRO_STATS.totalBookings}</p>
            <p className="text-xs text-gray-400 mt-0.5">Prenotazioni totali</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center mx-auto mb-2">
              <Star className="text-white" size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{MOCK_PRO_STATS.avgRating}</p>
            <p className="text-xs text-gray-400 mt-0.5">Valutazione media</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-400 flex items-center justify-center mx-auto mb-2">
              <Users className="text-white" size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{MOCK_PRO_STATS.totalClients}</p>
            <p className="text-xs text-gray-400 mt-0.5">Clienti serviti</p>
          </div>
        </div>

        {/* Monthly Earnings Bar Chart */}
        <div className="card-elevated p-5 mb-4">
          <h3 className="font-semibold text-sm text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-500" /> Guadagni mensili (EUR)
          </h3>
          <div className="flex items-end justify-between gap-2 h-40">
            {MOCK_PRO_STATS.monthlyEarnings.map((item, i) => {
              const maxAmount = Math.max(...MOCK_PRO_STATS.monthlyEarnings.map(e => e.amount));
              const heightPct = (item.amount / maxAmount) * 100;
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-gray-500">{item.amount}</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500 to-emerald-300 min-h-[4px]"
                  />
                  <span className="text-[10px] text-gray-400">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Bookings Line Chart (simplified as bars) */}
        <div className="card-elevated p-5 mb-4">
          <h3 className="font-semibold text-sm text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-500" /> Prenotazioni mensili
          </h3>
          <div className="flex items-end justify-between gap-2 h-32">
            {MOCK_PRO_STATS.monthlyBookings.map((item, i) => {
              const maxCount = Math.max(...MOCK_PRO_STATS.monthlyBookings.map(e => e.count));
              const heightPct = (item.count / maxCount) * 100;
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-gray-500">{item.count}</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-blue-300 min-h-[4px]"
                  />
                  <span className="text-[10px] text-gray-400">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Service Distribution */}
        <div className="card-elevated p-5 mb-4">
          <h3 className="font-semibold text-sm text-gray-900 mb-4 flex items-center gap-2">
            <PieChart size={16} className="text-violet-500" /> Distribuzione servizi
          </h3>
          {(() => {
            const total = MOCK_PRO_STATS.serviceDistribution.reduce((sum, s) => sum + s.count, 0);
            return (
              <div className="space-y-3">
                {MOCK_PRO_STATS.serviceDistribution.map((svc, i) => {
                  const pct = Math.round((svc.count / total) * 100);
                  return (
                    <div key={svc.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">{svc.category}</span>
                        <span className="text-xs text-gray-400">{svc.count} ({pct}%)</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: i * 0.15, duration: 0.6 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: svc.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Platform fee */}
        <div className="card-elevated p-3 mb-4 flex items-center justify-between">
          <span className="text-xs text-gray-500">Platform commission</span>
          <span className="text-xs font-semibold text-gray-700 bg-gray-50 px-2 py-0.5 rounded-full">
            {earnings?.platformFeeRate || '15%'}
          </span>
        </div>

        {/* Recent transactions */}
        {earnings?.recentTransactions?.length > 0 && (
          <div className="mb-4">
            <h2 className="section-title mb-3">Recent Transactions</h2>
            <div className="space-y-2">
              {earnings.recentTransactions.map((tx: any) => (
                <div key={tx.bookingId} className="card-elevated p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tx.service}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(tx.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">+{tx.netAmount} EUR</p>
                      <p className="text-[10px] text-gray-400">Fee: {tx.fee} EUR</p>
                      <span className={clsx(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5',
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
    </div>
  );
}
