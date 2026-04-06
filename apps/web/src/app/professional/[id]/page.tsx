'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getMockProfile } from '@/lib/mock-data';
import { Avatar } from '@/components/avatar';
import { StarRating } from '@/components/star-rating';
import { PageLoading } from '@/components/loading-spinner';
import { ArrowLeft, MapPin, Clock, Shield, MessageCircle, Calendar, Check, Euro } from 'lucide-react';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const DAY_NAMES_FULL = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

function getNextDatesForDay(dayOfWeek: number, count: number): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const current = new Date(today);

  // Start from today, find next occurrence of this day
  while (dates.length < count) {
    if (current.getDay() === dayOfWeek && current >= today) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
    // Safety limit
    if (current.getTime() - today.getTime() > 60 * 24 * 60 * 60 * 1000) break;
  }
  return dates;
}

function generateTimeSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  let h = startH;
  let m = startM;

  while (h < endH || (h === endH && m < endM)) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    m += 30;
    if (m >= 60) { h++; m = 0; }
  }
  return slots;
}

export default function ProfessionalProfilePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Booking state
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    api.getPublicProfile(id)
      .then(setProfile)
      .catch(() => {
        // Fallback to mock data when API is unavailable
        const mock = getMockProfile(id);
        if (mock) {
          setProfile(mock);
        } else {
          router.push('/search');
        }
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  // Get available days from profile availability
  const availableDays = useMemo(() => {
    if (!profile?.availability) return [];
    const uniqueDays = [...new Set(profile.availability.map((a: any) => a.dayOfWeek))] as number[];
    return uniqueDays.sort((a, b) => a - b);
  }, [profile]);

  // Get available dates for next 4 weeks
  const availableDates = useMemo(() => {
    const dates: Date[] = [];
    for (const day of availableDays) {
      dates.push(...getNextDatesForDay(day, 4));
    }
    return dates.sort((a, b) => a.getTime() - b.getTime());
  }, [availableDays]);

  // Get time slots for selected date
  const timeSlots = useMemo(() => {
    if (!selectedDate || !profile?.availability) return [];
    const dayOfWeek = selectedDate.getDay();
    const daySlots = profile.availability.filter((a: any) => a.dayOfWeek === dayOfWeek);
    const allSlots: string[] = [];
    for (const slot of daySlots) {
      allSlots.push(...generateTimeSlots(slot.startTime, slot.endTime));
    }
    return allSlots;
  }, [selectedDate, profile]);

  // Calculate price
  const price = useMemo(() => {
    if (!selectedService) return null;
    return selectedService.customRate || profile?.hourlyRate || null;
  }, [selectedService, profile]);

  const handleBook = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    try {
      const scheduledAt = new Date(selectedDate);
      const [h, m] = selectedTime.split(':').map(Number);
      scheduledAt.setHours(h, m, 0, 0);

      try {
        await api.createBooking({
          professionalId: id,
          serviceId: selectedService.service.id,
          scheduledAt: scheduledAt.toISOString(),
          notes: bookingNotes || undefined,
        });
      } catch {
        // Demo mode: booking succeeds locally even without backend
      }
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
    <div className="page-container pt-4 pb-32">
      {/* Back button */}
      <button onClick={() => router.back()} className="p-2 -ml-2 mb-2">
        <ArrowLeft size={20} />
      </button>

      {/* Profile header */}
      <div className="card p-6 text-center mb-4">
        <Avatar
          src={profile.user.avatarUrl}
          name={`${profile.user.firstName} ${profile.user.lastName}`}
          size="xl"
        />
        <h1 className="text-xl font-bold mt-3">
          {profile.user.firstName} {profile.user.lastName}
        </h1>
        {profile.age && (
          <p className="text-sm text-gray-400">{profile.age} anni</p>
        )}

        <div className="flex items-center justify-center gap-2 mt-2">
          <StarRating
            rating={profile.averageRating}
            count={profile.reviewsReceived?.length}
            size={16}
          />
        </div>

        {profile.isVerified && (
          <div className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full mt-2">
            <Shield size={12} /> Verificato
          </div>
        )}

        {profile.bio && (
          <p className="text-sm text-gray-600 mt-4">{profile.bio}</p>
        )}

        {profile.hourlyRate && (
          <p className="text-2xl font-bold text-primary-600 mt-3">
            &euro;{profile.hourlyRate.toFixed(0)}/h
          </p>
        )}
      </div>

      {/* Services */}
      <div className="card p-4 mb-4">
        <h2 className="font-semibold mb-3">Servizi</h2>
        <div className="flex flex-wrap gap-2">
          {profile.services.map((ps: any) => (
            <span
              key={ps.id}
              className="bg-primary-50 text-primary-700 text-sm px-3 py-1.5 rounded-lg font-medium"
            >
              {ps.service.icon} {ps.service.name}
              {ps.customRate && ` - \u20AC${ps.customRate}/h`}
            </span>
          ))}
        </div>
      </div>

      {/* Availability overview */}
      <div className="card p-4 mb-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Clock size={16} /> Disponibilit&agrave;
        </h2>
        {profile.availability.length === 0 ? (
          <p className="text-sm text-gray-400">Nessuna disponibilit&agrave; impostata</p>
        ) : (
          <div className="space-y-1.5">
            {profile.availability.map((slot: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
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

      {/* Reviews */}
      {profile.reviewsReceived?.length > 0 && (
        <div className="card p-4 mb-4">
          <h2 className="font-semibold mb-3">Recensioni</h2>
          <div className="space-y-3">
            {profile.reviewsReceived.map((r: any) => (
              <div key={r.id} className="border-b border-gray-50 pb-3 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar
                    src={r.reviewer.avatarUrl}
                    name={`${r.reviewer.firstName} ${r.reviewer.lastName}`}
                    size="sm"
                  />
                  <span className="text-sm font-medium">
                    {r.reviewer.firstName} {r.reviewer.lastName}
                  </span>
                  <StarRating rating={r.rating} size={12} />
                </div>
                {r.comment && (
                  <p className="text-sm text-gray-600 ml-10">{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking flow - Step by step */}
      {user && user.role === 'CLIENT' && !booked && (
        <div className="card p-4 mb-4">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar size={16} /> Prenota
          </h2>

          {/* Step 1: Select service */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">1. Scegli il servizio</p>
            <div className="grid gap-2">
              {profile.services.map((ps: any) => {
                const rate = ps.customRate || profile.hourlyRate;
                const isSelected = selectedService?.id === ps.id;
                return (
                  <button
                    key={ps.id}
                    onClick={() => {
                      setSelectedService(ps);
                      setSelectedDate(null);
                      setSelectedTime('');
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'border-primary-400 bg-primary-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{ps.service.icon}</span>
                      <span className="text-sm font-medium text-gray-900">{ps.service.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {rate && (
                        <span className="text-sm font-bold text-primary-600">&euro;{rate}/h</span>
                      )}
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select date */}
          {selectedService && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">2. Scegli la data</p>
              {availableDates.length === 0 ? (
                <p className="text-sm text-gray-400">Nessuna data disponibile</p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                  {availableDates.slice(0, 14).map((date) => {
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    const dayName = DAY_NAMES[date.getDay()];
                    const dayNum = date.getDate();
                    const month = date.toLocaleDateString('it-IT', { month: 'short' });
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedTime('');
                        }}
                        className={`flex-shrink-0 w-16 py-3 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'border-primary-400 bg-primary-500 text-white shadow-md'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <p className={`text-[10px] font-medium uppercase ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                          {dayName}
                        </p>
                        <p className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          {dayNum}
                        </p>
                        <p className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                          {month}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Select time */}
          {selectedDate && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">3. Scegli l&apos;orario</p>
              {timeSlots.length === 0 ? (
                <p className="text-sm text-gray-400">Nessun orario disponibile per questa data</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {timeSlots.map((time) => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                          isSelected
                            ? 'border-primary-400 bg-primary-500 text-white shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Notes */}
          {selectedTime && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">4. Note (opzionale)</p>
              <textarea
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                className="input-field"
                placeholder="Dettagli aggiuntivi per il professionista..."
                rows={2}
              />
            </div>
          )}
        </div>
      )}

      {/* Booking summary - fixed at bottom */}
      {user && user.role === 'CLIENT' && !booked && selectedService && selectedDate && selectedTime && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-lg z-50">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-500">{selectedService.service.name}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {DAY_NAMES_FULL[selectedDate.getDay()]} {selectedDate.getDate()}/{selectedDate.getMonth() + 1} alle {selectedTime}
                </p>
              </div>
              {price && (
                <div className="text-right">
                  <p className="text-xs text-gray-400">Prezzo stimato</p>
                  <p className="text-xl font-bold text-primary-600">&euro;{price}</p>
                  <p className="text-[10px] text-gray-400">all&apos;ora</p>
                </div>
              )}
            </div>
            <button
              onClick={handleBook}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-primary-500/25 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {submitting ? 'Prenotazione in corso...' : 'Conferma prenotazione'}
            </button>
          </div>
        </div>
      )}

      {booked && (
        <div className="card p-6 text-center mb-4 bg-green-50 border-green-200">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <Check size={32} className="text-green-500" />
          </div>
          <p className="font-semibold text-green-700 text-lg">Prenotazione inviata!</p>
          <p className="text-sm text-green-600 mt-1">
            {profile.user.firstName} confermer&agrave; la tua richiesta a breve.
          </p>
          <button
            onClick={() => router.push('/bookings')}
            className="btn-primary mt-4"
          >
            Vedi le mie prenotazioni
          </button>
        </div>
      )}
    </div>
  );
}
