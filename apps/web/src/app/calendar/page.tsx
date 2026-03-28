'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageLoading } from '@/components/loading-spinner';
import { MOCK_CALENDAR_BOOKINGS, MOCK_SWIPE_PROFESSIONALS } from '@/lib/mock-data';
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, CreditCard, Plus, X, Check } from 'lucide-react';
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

const SERVICE_OPTIONS = [
  { id: 'home-cleaning', name: 'Pulizia casa', category: 'CLEANING' },
  { id: 'deep-cleaning', name: 'Pulizia profonda', category: 'CLEANING' },
  { id: 'math-tutoring', name: 'Ripetizioni matematica', category: 'TUTORING' },
  { id: 'english-tutoring', name: 'Ripetizioni inglese', category: 'TUTORING' },
  { id: 'babysitting', name: 'Babysitting', category: 'BABYSITTING' },
  { id: 'dog-walking', name: 'Dog Walking', category: 'PET_SITTING' },
  { id: 'haircut', name: 'Taglio capelli', category: 'PERSONAL_CARE' },
  { id: 'massage', name: 'Massaggio', category: 'PERSONAL_CARE' },
  { id: 'manicure-&-pedicure', name: 'Manicure & Pedicure', category: 'PERSONAL_CARE' },
];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
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
  const [localBookings, setLocalBookings] = useState<any[]>([...MOCK_CALENDAR_BOOKINGS]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  // Add booking form state
  const [newService, setNewService] = useState('');
  const [newTime, setNewTime] = useState('10:00');
  const [newDuration, setNewDuration] = useState('60');
  const [newPro, setNewPro] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const bookingsByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    localBookings.forEach((b) => {
      const d = new Date(b.scheduledAt);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(b);
      }
    });
    return map;
  }, [currentYear, currentMonth, localBookings]);

  const days = useMemo(() => getCalendarDays(currentYear, currentMonth), [currentYear, currentMonth]);

  const selectedBookings = selectedDay ? (bookingsByDay[selectedDay] || []) : [];

  const goToPrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
    setSelectedDay(null);
  };

  const handleAddBooking = () => {
    if (!newService || !newTime || !selectedDay || !newPro) return;

    const pro = MOCK_SWIPE_PROFESSIONALS.find((p) => p.profileId === newPro);
    const svc = SERVICE_OPTIONS.find((s) => s.id === newService);

    const newBooking = {
      id: `booking-new-${Date.now()}`,
      clientId: 'user-client-1',
      professionalId: newPro,
      serviceId: newService,
      status: 'PENDING',
      scheduledAt: new Date(currentYear, currentMonth, selectedDay, parseInt(newTime.split(':')[0]), parseInt(newTime.split(':')[1])).toISOString(),
      duration: parseInt(newDuration),
      totalPrice: (pro?.hourlyRate || 30) * (parseInt(newDuration) / 60),
      service: { name: svc?.name || newService },
      professional: { user: { firstName: pro?.firstName || 'Pro', lastName: pro?.lastName || '', avatarUrl: undefined } },
      payment: null,
    };

    setLocalBookings((prev) => [...prev, newBooking]);
    setShowAddForm(false);
    setAddSuccess(true);
    setTimeout(() => setAddSuccess(false), 2000);

    // Reset form
    setNewService('');
    setNewTime('10:00');
    setNewDuration('60');
    setNewPro('');
  };

  if (loading || !user) return <PageLoading />;

  const isToday = (day: number) =>
    day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();

  // Professionals for the selected service
  const availablePros = newService
    ? MOCK_SWIPE_PROFESSIONALS.filter((p) => {
        const svc = SERVICE_OPTIONS.find((s) => s.id === newService);
        return svc && p.services.some((s: string) => s.toLowerCase().includes(svc.name.toLowerCase().split(' ')[0]));
      })
    : MOCK_SWIPE_PROFESSIONALS;

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
                  <span className={clsx('text-sm font-medium', isSelected && 'font-bold')}>
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

        {/* Success toast */}
        <AnimatePresence>
          {addSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2"
            >
              <Check size={16} className="text-emerald-500" />
              <span className="text-sm font-medium text-emerald-700">Prenotazione aggiunta!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected day bookings */}
        <AnimatePresence mode="wait">
          {selectedDay && (
            <motion.div
              key={`day-${selectedDay}-${currentMonth}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  {selectedDay} {MONTH_NAMES[currentMonth]}
                </h3>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className={clsx(
                    'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all',
                    showAddForm
                      ? 'bg-gray-200 text-gray-600'
                      : 'bg-primary-500 text-white shadow-sm shadow-primary-500/25 hover:bg-primary-600'
                  )}
                >
                  {showAddForm ? <X size={14} /> : <Plus size={14} />}
                  {showAddForm ? 'Annulla' : 'Prenota'}
                </button>
              </div>

              {/* Add booking form */}
              <AnimatePresence>
                {showAddForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="card-elevated p-5 mb-4 border-2 border-primary-100">
                      <h4 className="text-sm font-bold text-gray-900 mb-4">
                        Nuova prenotazione — {selectedDay} {MONTH_NAMES[currentMonth]}
                      </h4>

                      {/* Service */}
                      <div className="mb-3">
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Servizio</label>
                        <select
                          value={newService}
                          onChange={(e) => { setNewService(e.target.value); setNewPro(''); }}
                          className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm border border-gray-200 focus:outline-none focus:border-primary-300"
                        >
                          <option value="">Seleziona un servizio</option>
                          {SERVICE_OPTIONS.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Professional */}
                      <div className="mb-3">
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Professionista</label>
                        <select
                          value={newPro}
                          onChange={(e) => setNewPro(e.target.value)}
                          className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm border border-gray-200 focus:outline-none focus:border-primary-300"
                        >
                          <option value="">Seleziona un professionista</option>
                          {availablePros.map((p) => (
                            <option key={p.profileId} value={p.profileId}>
                              {p.firstName} {p.lastName} — €{p.hourlyRate}/h ({p.averageRating} ★)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Time + Duration row */}
                      <div className="flex gap-3 mb-4">
                        <div className="flex-1">
                          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Orario</label>
                          <input
                            type="time"
                            value={newTime}
                            onChange={(e) => setNewTime(e.target.value)}
                            className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm border border-gray-200 focus:outline-none focus:border-primary-300"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Durata</label>
                          <select
                            value={newDuration}
                            onChange={(e) => setNewDuration(e.target.value)}
                            className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm border border-gray-200 focus:outline-none focus:border-primary-300"
                          >
                            <option value="30">30 min</option>
                            <option value="60">1 ora</option>
                            <option value="90">1.5 ore</option>
                            <option value="120">2 ore</option>
                            <option value="180">3 ore</option>
                          </select>
                        </div>
                      </div>

                      {/* Price preview */}
                      {newPro && newDuration && (
                        <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center justify-between">
                          <span className="text-xs text-gray-500">Prezzo stimato</span>
                          <span className="text-sm font-bold text-accent-600">
                            €{((MOCK_SWIPE_PROFESSIONALS.find((p) => p.profileId === newPro)?.hourlyRate || 30) * (parseInt(newDuration) / 60)).toFixed(2)}
                          </span>
                        </div>
                      )}

                      <button
                        onClick={handleAddBooking}
                        disabled={!newService || !newPro || !newTime}
                        className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Check size={16} /> Conferma prenotazione
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {selectedBookings.length === 0 && !showAddForm ? (
                <div className="card-elevated p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">📅</span>
                  </div>
                  <p className="text-gray-400 text-sm">Nessuna prenotazione per questo giorno</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="mt-3 text-xs font-semibold text-primary-600 bg-primary-50 px-4 py-2 rounded-xl hover:bg-primary-100 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Aggiungi prenotazione
                  </button>
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
