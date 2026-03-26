'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Avatar } from '@/components/avatar';
import { StarRating } from '@/components/star-rating';
import { PageLoading } from '@/components/loading-spinner';
import { ArrowLeft, Clock, Shield } from 'lucide-react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProfessionalProfileView() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingService, setBookingService] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    api.getPublicProfile(id)
      .then(setProfile)
      .catch(() => router.push('/search'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleBook = async () => {
    if (!bookingService || !bookingDate || !bookingTime) return;
    setSubmitting(true);
    try {
      await api.createBooking({
        professionalId: id,
        serviceId: bookingService,
        scheduledAt: new Date(`${bookingDate}T${bookingTime}`).toISOString(),
        notes: bookingNotes || undefined,
      });
      setBooked(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading />;
  if (!profile) return null;

  return (
    <div className="animate-fade-up">
      {/* Hero header */}
      <div className="gradient-hero-soft px-5 pt-6 pb-8">
        <div className="max-w-lg mx-auto">
          <button onClick={() => router.back()} className="p-2 -ml-2 mb-2 rounded-xl hover:bg-white/50 transition-colors">
            <ArrowLeft size={20} />
          </button>

          <div className="text-center">
            <Avatar
              src={profile.user.avatarUrl}
              name={`${profile.user.firstName} ${profile.user.lastName}`}
              size="xl"
            />
            <h1 className="text-xl font-bold mt-4 text-gray-900">
              {profile.user.firstName} {profile.user.lastName}
            </h1>
            {profile.age && (
              <p className="text-sm text-gray-500">{profile.age} years old</p>
            )}

            <div className="flex items-center justify-center gap-2 mt-2">
              <StarRating
                rating={profile.averageRating}
                count={profile.reviewsReceived?.length}
                size={16}
              />
            </div>

            {profile.isVerified && (
              <div className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-white shadow-sm px-3 py-1.5 rounded-full mt-3">
                <Shield size={12} /> Verified Professional
              </div>
            )}

            {profile.hourlyRate && (
              <p className="text-2xl font-bold text-accent-600 mt-3">
                {profile.hourlyRate.toFixed(0)}/h
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="page-container -mt-2">
        {profile.bio && (
          <div className="card-elevated p-5 mb-3">
            <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
          </div>
        )}

        <div className="card-elevated p-5 mb-3">
          <h2 className="font-semibold mb-3 text-gray-900">Services</h2>
          <div className="flex flex-wrap gap-2">
            {profile.services.map((ps: any) => (
              <span
                key={ps.id}
                className="bg-primary-50 text-primary-700 text-sm px-3 py-1.5 rounded-xl font-medium"
              >
                {ps.service.icon} {ps.service.name}
                {ps.customRate && ` - ${ps.customRate}/h`}
              </span>
            ))}
          </div>
        </div>

        <div className="card-elevated p-5 mb-3">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-gray-900">
            <Clock size={16} className="text-gray-400" /> Availability
          </h2>
          {profile.availability.length === 0 ? (
            <p className="text-sm text-gray-400">No availability set</p>
          ) : (
            <div className="space-y-2">
              {profile.availability.map((slot: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded-xl px-3 py-2">
                  <span className="font-medium text-gray-700 w-12">
                    {DAY_NAMES[slot.dayOfWeek]}
                  </span>
                  <span className="text-gray-500">
                    {slot.startTime} - {slot.endTime}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {profile.reviewsReceived?.length > 0 && (
          <div className="card-elevated p-5 mb-3">
            <h2 className="font-semibold mb-3 text-gray-900">Reviews</h2>
            <div className="space-y-4">
              {profile.reviewsReceived.map((r: any) => (
                <div key={r.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Avatar
                      src={r.reviewer.avatarUrl}
                      name={`${r.reviewer.firstName} ${r.reviewer.lastName}`}
                      size="sm"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {r.reviewer.firstName} {r.reviewer.lastName}
                    </span>
                    <StarRating rating={r.rating} size={12} />
                  </div>
                  {r.comment && (
                    <p className="text-sm text-gray-500 ml-10">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {user && user.role === 'CLIENT' && !booked && (
          <div className="card-elevated p-5 mb-3">
            <h2 className="font-semibold mb-4 text-gray-900">Book this professional</h2>
            <div className="space-y-3">
              <select
                value={bookingService}
                onChange={(e) => setBookingService(e.target.value)}
                className="input-field"
              >
                <option value="">Select a service</option>
                {profile.services.map((ps: any) => (
                  <option key={ps.service.id} value={ps.service.id}>
                    {ps.service.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="input-field"
              />

              <input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="input-field"
              />

              <textarea
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                className="input-field"
                placeholder="Any special notes? (optional)"
                rows={2}
              />

              <button
                onClick={handleBook}
                disabled={!bookingService || !bookingDate || !bookingTime || submitting}
                className="btn-primary w-full"
              >
                {submitting ? 'Booking...' : 'Request Booking'}
              </button>
            </div>
          </div>
        )}

        {booked && (
          <div className="card-elevated p-6 text-center mb-3 bg-emerald-50 border-emerald-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">✅</span>
            </div>
            <p className="font-semibold text-emerald-700 text-lg">Booking request sent!</p>
            <p className="text-sm text-emerald-600 mt-1">
              {profile.user.firstName} will confirm your request shortly.
            </p>
            <button
              onClick={() => router.push('/bookings')}
              className="btn-primary mt-4"
            >
              View My Bookings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
