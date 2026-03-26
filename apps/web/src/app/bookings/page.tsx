'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Avatar } from '@/components/avatar';
import { PageLoading } from '@/components/loading-spinner';
import { Calendar, Clock, Shield, CreditCard, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700',
  ACCEPTED: 'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-purple-50 text-purple-700',
  COMPLETED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  DISPUTED: 'bg-red-50 text-red-700',
};

const PAYMENT_STYLES: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Payment Pending', color: 'text-yellow-600', icon: Clock },
  HELD: { label: 'In Escrow', color: 'text-blue-600', icon: Shield },
  RELEASED: { label: 'Paid', color: 'text-green-600', icon: CheckCircle2 },
  REFUNDED: { label: 'Refunded', color: 'text-gray-500', icon: XCircle },
};

export default function BookingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      const fetchBookings = user.role === 'PROFESSIONAL'
        ? api.getProfessionalBookings()
        : api.getClientBookings();

      fetchBookings
        .then(setBookings)
        .catch(() => setBookings([]))
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) return <PageLoading />;
  if (!user) return null;

  const isPro = user.role === 'PROFESSIONAL';

  const handleStatusUpdate = async (bookingId: string, status: string) => {
    setActionLoading(bookingId);
    try {
      await api.updateBookingStatus(bookingId, status);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status } : b)),
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePayment = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const result = await api.createBookingPayment(bookingId);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, payment: result.payment } : b)),
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReleasePayment = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const payment = await api.releasePayment(bookingId);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, payment } : b)),
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="page-container pt-8">
      <h1 className="text-2xl font-bold mb-6">
        {isPro ? 'Incoming Requests' : 'My Bookings'}
      </h1>

      {bookings.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-gray-500 font-medium">No bookings yet</p>
          {!isPro && (
            <button
              onClick={() => router.push('/search')}
              className="btn-primary mt-4"
            >
              Find a Professional
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const other = isPro ? booking.client : booking.professional?.user;
            const otherName = other
              ? `${other.firstName} ${other.lastName}`
              : 'Unknown';
            const date = new Date(booking.scheduledAt);
            const payment = booking.payment;
            const paymentInfo = payment ? PAYMENT_STYLES[payment.status] : null;
            const isLoading = actionLoading === booking.id;

            return (
              <div key={booking.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <Avatar src={other?.avatarUrl} name={otherName} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-sm">{otherName}</h3>
                      <span
                        className={clsx(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          STATUS_STYLES[booking.status] || 'bg-gray-100',
                        )}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {booking.service?.name}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {date.toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Price & Payment status */}
                    <div className="flex items-center justify-between mt-2">
                      {booking.totalPrice != null && (
                        <p className="text-sm font-bold text-accent-600">
                          {booking.totalPrice.toFixed(2)} EUR
                        </p>
                      )}
                      {paymentInfo && (
                        <span className={`flex items-center gap-1 text-xs font-medium ${paymentInfo.color}`}>
                          <paymentInfo.icon size={12} />
                          {paymentInfo.label}
                        </span>
                      )}
                    </div>

                    {/* ─── Client Actions ─── */}
                    {!isPro && (
                      <>
                        {/* Pay button: show when ACCEPTED and no payment yet */}
                        {booking.status === 'ACCEPTED' && !payment && (
                          <button
                            onClick={() => handlePayment(booking.id)}
                            disabled={isLoading}
                            className="w-full bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold py-2.5 rounded-lg mt-3 transition-colors flex items-center justify-center gap-2"
                          >
                            <CreditCard size={16} />
                            {isLoading ? 'Processing...' : `Pay ${booking.totalPrice?.toFixed(2)} EUR (Escrow)`}
                          </button>
                        )}

                        {/* Escrow info */}
                        {payment?.status === 'HELD' && booking.status !== 'COMPLETED' && (
                          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-3">
                            <div className="flex items-start gap-2">
                              <Shield size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-blue-700">Payment held in escrow</p>
                                <p className="text-[11px] text-blue-600 mt-0.5">
                                  Your money is safe. It will be released to the professional only after the service is completed.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Confirm & release payment after completion */}
                        {booking.status === 'COMPLETED' && payment?.status === 'HELD' && (
                          <button
                            onClick={() => handleReleasePayment(booking.id)}
                            disabled={isLoading}
                            className="w-full bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-lg mt-3 transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 size={16} />
                            {isLoading ? 'Releasing...' : 'Confirm & Release Payment'}
                          </button>
                        )}

                        {/* Cancel */}
                        {['PENDING', 'ACCEPTED'].includes(booking.status) && (
                          <button
                            onClick={() => handleStatusUpdate(booking.id, 'CANCELLED')}
                            disabled={isLoading}
                            className="text-red-500 text-xs font-medium mt-3 hover:underline"
                          >
                            Cancel Booking
                          </button>
                        )}
                      </>
                    )}

                    {/* ─── Professional Actions ─── */}
                    {isPro && (
                      <>
                        {booking.status === 'PENDING' && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleStatusUpdate(booking.id, 'ACCEPTED')}
                              disabled={isLoading}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(booking.id, 'CANCELLED')}
                              disabled={isLoading}
                              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold py-2 rounded-lg transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        )}

                        {booking.status === 'ACCEPTED' && !payment && (
                          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-2.5 mt-3">
                            <p className="text-[11px] text-yellow-700 flex items-center gap-1">
                              <AlertTriangle size={12} />
                              Waiting for client to pay before starting
                            </p>
                          </div>
                        )}

                        {booking.status === 'ACCEPTED' && payment?.status === 'HELD' && (
                          <button
                            onClick={() => handleStatusUpdate(booking.id, 'IN_PROGRESS')}
                            disabled={isLoading}
                            className="w-full bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold py-2 rounded-lg mt-3 transition-colors"
                          >
                            Start Service
                          </button>
                        )}

                        {booking.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => handleStatusUpdate(booking.id, 'COMPLETED')}
                            disabled={isLoading}
                            className="w-full bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2 rounded-lg mt-3 transition-colors"
                          >
                            Mark Completed
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
