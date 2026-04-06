'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { PageLoading } from '@/components/loading-spinner';
import { ArrowLeft, CreditCard, Shield, Lock, Check, Clock, Calendar } from 'lucide-react';
import { Avatar } from '@/components/avatar';
import { motion } from 'framer-motion';

export default function CheckoutClient({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [booking, setBooking] = useState<any>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [payError, setPayError] = useState('');
  const [step, setStep] = useState<'checkout' | 'processing' | 'success'>('checkout');
  const [paidTotal, setPaidTotal] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.getClientBookings()
      .then((bookings) => {
        const found = bookings.find((b: any) => b.id === bookingId);
        setBooking(found || null);
      })
      .catch(() => setBooking(null))
      .finally(() => setLoadingBooking(false));
  }, [user, bookingId]);

  if (loading || !user || loadingBooking) return <PageLoading />;

  if (!booking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Prenotazione non trovata</p>
          <button onClick={() => router.push('/bookings')} className="btn-primary">Torna alle prenotazioni</button>
        </div>
      </div>
    );
  }

  const other = booking.professional?.user;
  const otherName = other ? `${other.firstName} ${other.lastName}` : 'Professionista';
  const subtotal = booking.totalPrice || 0;
  const platformFee = Math.round(subtotal * 0.05 * 100) / 100;
  const total = Math.round((subtotal + platformFee) * 100) / 100;

  const handlePay = async () => {
    setPayError('');
    setStep('processing');
    try {
      await api.createBookingPayment(bookingId);
      setPaidTotal(total);
      setStep('success');
      setTimeout(() => router.push('/bookings'), 2500);
    } catch (err: any) {
      setPayError(err.message || 'Errore nel pagamento');
      setStep('checkout');
    }
  };

  // Processing animation
  if (step === 'processing') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-primary-50 to-white">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center p-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            className="w-16 h-16 border-4 border-primary-200 border-t-primary-500 rounded-full mx-auto mb-6"
          />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Elaborazione pagamento...</h2>
          <p className="text-gray-400 text-sm">Non chiudere questa pagina</p>
        </motion.div>
      </div>
    );
  }

  // Success
  if (step === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-emerald-50 to-white">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"
          >
            <Check size={40} className="text-emerald-500" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamento completato!</h2>
          <p className="text-gray-500 text-sm">&euro;{paidTotal.toFixed(2)} addebitati con successo</p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
            <Shield size={12} /> Fondi in escrow fino al completamento del servizio
          </div>
          <p className="text-gray-300 text-xs mt-4">Reindirizzamento...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="gradient-hero px-5 pt-14 pb-8 rounded-b-[2.5rem]">
        <div className="max-w-lg mx-auto">
          <button onClick={() => router.push('/bookings')} className="text-white/80 mb-3 flex items-center gap-1 text-sm">
            <ArrowLeft size={18} /> Torna indietro
          </button>
          <div className="flex items-center gap-3">
            <CreditCard size={28} className="text-white" />
            <div>
              <h1 className="text-2xl font-bold text-white">Checkout</h1>
              <p className="text-white/70 text-sm">Pagamento sicuro</p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-container -mt-4">
        {/* Order summary */}
        <div className="card-elevated p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Riepilogo ordine</h3>
          <div className="flex items-start gap-3">
            <Avatar src={other?.avatarUrl} name={otherName} size="md" />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{otherName}</p>
              <p className="text-xs text-gray-500 mt-0.5">{booking.service?.name}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar size={11} /> {new Date(booking.scheduledAt).toLocaleDateString('it-IT')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={11} /> {new Date(booking.scheduledAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {booking.duration && (
                <p className="text-xs text-gray-400 mt-1">Durata: {booking.duration} min</p>
              )}
            </div>
          </div>
        </div>

        {/* Payment method - demo mode */}
        <div className="card-elevated p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Metodo di pagamento</h3>
          <div className="flex items-center gap-3 p-3 rounded-2xl border border-primary-300 bg-primary-50">
            <div className="w-12 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center text-white text-[10px] font-bold">
              DEMO
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Pagamento demo</p>
              <p className="text-[10px] text-gray-400">Nessun addebito reale</p>
            </div>
            <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
              <Check size={12} className="text-white" />
            </div>
          </div>
        </div>

        {/* Price breakdown */}
        <div className="card-elevated p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Dettaglio prezzo</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotale</span>
              <span className="text-gray-700">&euro;{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Commissione servizio (5%)</span>
              <span className="text-gray-700">&euro;{platformFee.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between">
              <span className="font-bold text-gray-900">Totale</span>
              <span className="font-bold text-lg text-gray-900">&euro;{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {payError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <p className="text-xs text-red-600">{payError}</p>
          </div>
        )}

        {/* Security badges */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Lock size={12} /> Pagamento sicuro
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Shield size={12} /> Protetto da escrow
          </div>
        </div>

        {/* Pay button */}
        <button
          onClick={handlePay}
          className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary-500/25 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base mb-3"
        >
          <Lock size={18} /> Paga &euro;{total.toFixed(2)}
        </button>

        <p className="text-[10px] text-center text-gray-300 mb-20">
          Il pagamento verr&agrave; trattenuto in escrow e rilasciato al professionista dopo il completamento del servizio
        </p>
      </div>
    </div>
  );
}
