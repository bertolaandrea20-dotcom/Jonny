'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageLoading } from '@/components/loading-spinner';
import { MOCK_CLIENT_BOOKINGS, MOCK_PAYMENT_METHODS, MOCK_PROMO_CODES } from '@/lib/mock-data';
import { ArrowLeft, CreditCard, Shield, Lock, Check, Tag, X, Clock, Calendar } from 'lucide-react';
import { Avatar } from '@/components/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

const CARD_ICONS: Record<string, string> = {
  visa: '💳',
  mastercard: '💳',
};

const CARD_COLORS: Record<string, string> = {
  visa: 'from-blue-600 to-blue-800',
  mastercard: 'from-orange-500 to-red-600',
};

export default function CheckoutClient({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [selectedCard, setSelectedCard] = useState(MOCK_PAYMENT_METHODS[0]?.id || '');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ discount: number; type: 'percent' | 'fixed'; label: string } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [step, setStep] = useState<'checkout' | 'processing' | 'success'>('checkout');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading || !user) return <PageLoading />;

  const booking = MOCK_CLIENT_BOOKINGS.find((b) => b.id === bookingId);
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

  let discount = 0;
  if (appliedPromo) {
    discount = appliedPromo.type === 'percent'
      ? Math.round(subtotal * (appliedPromo.discount / 100) * 100) / 100
      : appliedPromo.discount;
  }
  const total = Math.max(0, Math.round((subtotal + platformFee - discount) * 100) / 100);

  const handleApplyPromo = () => {
    setPromoError('');
    const code = promoCode.trim().toUpperCase();
    const promo = MOCK_PROMO_CODES[code];
    if (promo) {
      setAppliedPromo(promo);
      setPromoError('');
    } else {
      setPromoError('Codice non valido');
      setAppliedPromo(null);
    }
  };

  const handlePay = () => {
    setStep('processing');
    setTimeout(() => {
      setStep('success');
      setTimeout(() => router.push('/bookings'), 2500);
    }, 2000);
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
          <p className="text-gray-500 text-sm">€{total.toFixed(2)} addebitati con successo</p>
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

        {/* Payment method */}
        <div className="card-elevated p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Metodo di pagamento</h3>
          <div className="space-y-2">
            {MOCK_PAYMENT_METHODS.map((card) => (
              <button
                key={card.id}
                onClick={() => setSelectedCard(card.id)}
                className={clsx(
                  'w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left',
                  selectedCard === card.id
                    ? 'border-primary-300 bg-primary-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                <div className={clsx(
                  'w-12 h-8 rounded-lg bg-gradient-to-r flex items-center justify-center text-white text-[10px] font-bold uppercase',
                  CARD_COLORS[card.type] || 'from-gray-400 to-gray-600'
                )}>
                  {card.type === 'visa' ? 'VISA' : 'MC'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">•••• •••• •••• {card.last4}</p>
                  <p className="text-[10px] text-gray-400">Scade {card.expiry}</p>
                </div>
                {selectedCard === card.id && (
                  <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                )}
                {card.isDefault && selectedCard !== card.id && (
                  <span className="text-[9px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Default</span>
                )}
              </button>
            ))}

            {/* Add new card (fake) */}
            <button className="w-full flex items-center gap-3 p-3 rounded-2xl border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-all">
              <div className="w-12 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <CreditCard size={16} />
              </div>
              <span className="text-sm font-medium">Aggiungi nuova carta</span>
            </button>
          </div>
        </div>

        {/* Promo code */}
        <div className="card-elevated p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Codice sconto</h3>
          {appliedPromo ? (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-emerald-600" />
                <div>
                  <p className="text-xs font-semibold text-emerald-700">{promoCode.toUpperCase()}</p>
                  <p className="text-[10px] text-emerald-600">{appliedPromo.label}</p>
                </div>
              </div>
              <button onClick={() => { setAppliedPromo(null); setPromoCode(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); }}
                placeholder="Es. WELCOME10"
                className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 text-sm border border-gray-200 focus:outline-none focus:border-primary-300"
              />
              <button
                onClick={handleApplyPromo}
                disabled={!promoCode.trim()}
                className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl disabled:opacity-40 hover:bg-gray-800 transition-colors"
              >
                Applica
              </button>
            </div>
          )}
          {promoError && <p className="text-xs text-red-500 mt-2">{promoError}</p>}
        </div>

        {/* Price breakdown */}
        <div className="card-elevated p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Dettaglio prezzo</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotale</span>
              <span className="text-gray-700">€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Commissione servizio</span>
              <span className="text-gray-700">€{platformFee.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600">Sconto</span>
                <span className="text-emerald-600 font-medium">-€{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between">
              <span className="font-bold text-gray-900">Totale</span>
              <span className="font-bold text-lg text-gray-900">€{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

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
          disabled={!selectedCard}
          className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary-500/25 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50 mb-3"
        >
          <Lock size={18} /> Paga €{total.toFixed(2)}
        </button>

        <p className="text-[10px] text-center text-gray-300 mb-20">
          Il pagamento verrà trattenuto in escrow e rilasciato al professionista dopo il completamento del servizio
        </p>
      </div>
    </div>
  );
}
