'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Avatar } from '@/components/avatar';
import { PageLoading } from '@/components/loading-spinner';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700',
  ACCEPTED: 'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-purple-50 text-purple-700',
  COMPLETED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  DISPUTED: 'bg-red-50 text-red-700',
};

export default function BookingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    try {
      await api.updateBookingStatus(bookingId, status);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status } : b)),
      );
    } catch (err: any) {
      alert(err.message);
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
                    {booking.totalPrice != null && (
                      <p className="text-sm font-bold text-primary-600 mt-2">
                        {booking.totalPrice.toFixed(2)}
                      </p>
                    )}

                    {/* Action buttons for professionals */}
                    {isPro && booking.status === 'PENDING' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleStatusUpdate(booking.id, 'ACCEPTED')}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(booking.id, 'CANCELLED')}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold py-2 rounded-lg transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {isPro && booking.status === 'ACCEPTED' && (
                      <button
                        onClick={() => handleStatusUpdate(booking.id, 'IN_PROGRESS')}
                        className="w-full bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold py-2 rounded-lg mt-3 transition-colors"
                      >
                        Start Service
                      </button>
                    )}

                    {isPro && booking.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleStatusUpdate(booking.id, 'COMPLETED')}
                        className="w-full bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2 rounded-lg mt-3 transition-colors"
                      >
                        Mark Completed
                      </button>
                    )}

                    {/* Cancel button for clients */}
                    {!isPro && ['PENDING', 'ACCEPTED'].includes(booking.status) && (
                      <button
                        onClick={() => handleStatusUpdate(booking.id, 'CANCELLED')}
                        className="text-red-500 text-xs font-medium mt-3 hover:underline"
                      >
                        Cancel Booking
                      </button>
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
