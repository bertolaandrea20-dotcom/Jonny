'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageLoading } from '@/components/loading-spinner';
import { MOCK_CALENDAR_BOOKINGS } from '@/lib/mock-data';
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, CreditCard } from 'lucide-react';
import { Avatar } from '@/components/avatar';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-400',
  ACCEPTED: 'bg-blue-400',
  IN_PROGRESS: 'bg-violet-400',
  COMPLETED: 'bg-emerald-400',
  CANCELLED: 'bg-gray-300',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'In attesa',
  ACCEPTED: 'Confermata',
  IN_PROGRESS: 'In corso',
  COMPLETED: 'Completata',
  CANCELLED: 'Annullata',
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-100',
  ACCEPTED: 'bg-blue-50 text-blue-700 border border-blue-100',
  IN_PROGRESS: 'bg-violet-50 text-violet-700 border border-violet-100',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  CANCELLED: 'bg-gray-50 text-gray-500 border border-gray-100',
};

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Monday = 0, Sunday = 6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: (number | null)[] = [];
  // Padding before
  for (let i = 0; i < startDow; i++) days.push(null);
  // Actual days
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  // Padding after to fill last row
  while (days.length % 7 !== 0) days.push(null);

  return days;
}

export default function CalendarPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  // Map bookings by day
  const bookingsByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    MOCK_CALENDAR_BOOKINGS.forEach((b) => {
      const d = new Date(b.scheduledAt);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(b);
      }
    });
    return map;
  }, [currentYear, currentMonth]);

  const days = useMemo(() => getCalendarDays(currentYear, currentMonth), [currentYear, currentMonth]);

  const selectedBookings = selectedDay ? (bookingsByDay[selectedDay] || []) : [];

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDay(null);
  };

  if (loading || !user) return <PageLoading />;

  const isToday = (day: number) =>
    day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="gradient-hero px-5 pt-14 pb-8 rounded-b-[2.5rem]">
        <div className="max-w-lg mx-auto">
          <button onClick={() => router.push('/bookings')} className="text-white/80 mb-3 flex items-center gap-1 text-sm">
            <ArrowLeft size={18} /> Prenotazioni
          </button>
          <h1 className="text-2xl font-bold text-white">Calendario</h1>
          <p className="text-white/70 text-sm mt-1">Le tue prenotazioni in un colpo d&apos;occhio</p>
        </div>
      </div>

      <div className="page-container -mt-4">
        {/* Month navigation */}
        <div className="card-elevated p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={goToPrevMonth} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <h2 className="text-lg font-bold text-gray-900">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <button onClick={goToNextMonth} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_LABELS.map((label) => (
              <div key={label} className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1">
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;

              const hasBookings = !!bookingsByDay[day];
              const isSelected = day === selectedDay;
              const today = isToday(day);
              const bookingStatuses = bookingsByDay[day]?.map((b: any) => b.status) || [];

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  className={clsx(
                    'relative flex flex-col items-center justify-center py-2 rounded-xl transition-all',
                    isSelected
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                      : today
                        ? 'bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                        : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <span className={clsx(
                    'text-sm font-medium',
                    isSelected && 'font-bold'
                  )}>
                    {day}
                  </span>
                  {hasBookings && (
                    <div className="flex gap-0.5 mt-0.5">
                      {bookingStatuses.slice(0, 3).map((status: string, j: number) => (
                        <span
                          key={j}
                          className={clsx(
                            'w-1.5 h-1.5 rounded-full',
                            isSelected ? 'bg-white/70' : (STATUS_COLORS[status] || 'bg-gray-300')
                          )}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4 px-1">
          {Object.entries(STATUS_COLORS).filter(([k]) => k !== 'CANCELLED').map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={clsx('w-2 h-2 rounded-full', color)} />
              <span className="text-[10px] text-gray-400">{STATUS_LABELS[status]}</span>
            </div>
          ))}
        </div>

        {/* Selected day bookings */}
        <AnimatePresence mode="wait">
          {selectedDay && (
            <motion.div
              key={selectedDay}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {selectedDay} {MONTH_NAMES[currentMonth]}
              </h3>

              {selectedBookings.length === 0 ? (
                <div className="card-elevated p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">📅</span>
                  </div>
                  <p className="text-gray-400 text-sm">Nessuna prenotazione per questo giorno</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedBookings.map((booking: any) => {
                    const pro = booking.professional?.user;
                    const proName = pro ? `${pro.firstName} ${pro.lastName}` : 'Professionista';
                    const time = new Date(booking.scheduledAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

                    return (
                      <motion.div
                        key={booking.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="card-elevated p-4"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar src={pro?.avatarUrl} name={proName} size="md" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <h4 className="font-semibold text-sm text-gray-900">{proName}</h4>
                              <span className={clsx(
                                'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                                STATUS_STYLES[booking.status] || 'bg-gray-100'
                              )}>
                                {STATUS_LABELS[booking.status] || booking.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{booking.service?.name}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <Clock size={11} /> {time} · {booking.duration}min
                              </span>
                              {booking.totalPrice != null && (
                                <span className="text-xs font-bold text-accent-600">
                                  €{booking.totalPrice.toFixed(2)}
                                </span>
                              )}
                            </div>

                            {/* Pay action for accepted without payment */}
                            {booking.status === 'ACCEPTED' && !booking.payment && (
                              <button
                                onClick={() => router.push(`/checkout/${booking.id}`)}
                                className="mt-2 text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-primary-100 transition-colors"
                              >
                                <CreditCard size={12} /> Paga ora
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-20" />
      </div>
    </div>
  );
}
