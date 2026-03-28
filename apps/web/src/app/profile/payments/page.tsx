'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, CreditCard, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_PAYMENT_METHODS } from '@/lib/mock-data';

const CARD_COLORS: Record<string, string> = {
  visa: 'from-blue-600 to-blue-800',
  mastercard: 'from-orange-500 to-red-600',
  amex: 'from-emerald-600 to-teal-700',
};

const CARD_LABELS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
};

export default function PaymentsPage() {
  const router = useRouter();
  const [cards, setCards] = useState(MOCK_PAYMENT_METHODS);
  const [showForm, setShowForm] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [holder, setHolder] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState('');

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const detectCardType = (num: string): string => {
    const d = num.replace(/\s/g, '');
    if (d.startsWith('4')) return 'visa';
    if (d.startsWith('5')) return 'mastercard';
    if (d.startsWith('3')) return 'amex';
    return 'visa';
  };

  const handleAdd = async () => {
    if (!cardNumber || !expiry || !cvv || !holder) return;
    setSaving(true);

    // Simulate processing
    await new Promise((r) => setTimeout(r, 1500));

    const type = detectCardType(cardNumber);
    const last4 = cardNumber.replace(/\s/g, '').slice(-4);
    const newCard = {
      id: 'card-' + Date.now(),
      type,
      last4,
      expiry,
      holder,
      isDefault: cards.length === 0,
    };

    setSaving(false);
    setSuccess(true);

    setTimeout(() => {
      setCards([...cards, newCard]);
      setCardNumber('');
      setExpiry('');
      setCvv('');
      setHolder('');
      setShowForm(false);
      setSuccess(false);
      setToast('Carta aggiunta');
      setTimeout(() => setToast(''), 2000);
    }, 1000);
  };

  const handleDelete = (id: string) => {
    setCards(cards.filter((c) => c.id !== id));
    setToast('Carta rimossa');
    setTimeout(() => setToast(''), 2000);
  };

  const handleSetDefault = (id: string) => {
    setCards(cards.map((c) => ({ ...c, isDefault: c.id === id })));
  };

  return (
    <div className="page-container pt-4 pb-28">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">Metodi di pagamento</h1>
      </div>

      {/* Cards list */}
      <div className="space-y-3">
        <AnimatePresence>
          {cards.map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: i * 0.05 }}
            >
              {/* Mini card visual */}
              <div className={`bg-gradient-to-br ${CARD_COLORS[card.type] || CARD_COLORS.visa} rounded-2xl p-4 text-white shadow-md relative overflow-hidden`}>
                {/* Decorative circles */}
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/10" />

                <div className="flex items-start justify-between relative">
                  <div>
                    <p className="text-xs text-white/60 mb-1">{CARD_LABELS[card.type] || card.type}</p>
                    <p className="text-lg font-mono tracking-widest">•••• {card.last4}</p>
                  </div>
                  {card.isDefault && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/20">
                      Predefinita
                    </span>
                  )}
                </div>

                <div className="flex items-end justify-between mt-4 relative">
                  <div>
                    <p className="text-[10px] text-white/50">TITOLARE</p>
                    <p className="text-xs font-medium">{card.holder}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-white/50">SCADENZA</p>
                    <p className="text-xs font-medium">{card.expiry}</p>
                  </div>
                </div>

                {/* Action buttons overlay */}
                <div className="absolute top-3 right-3 flex gap-1">
                  {!card.isDefault && (
                    <button
                      onClick={() => handleSetDefault(card.id)}
                      className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                      title="Imposta come predefinita"
                    >
                      <Check size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(card.id)}
                    className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-red-500/50 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {cards.length === 0 && !showForm && (
          <div className="text-center py-12">
            <CreditCard size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Nessun metodo di pagamento</p>
          </div>
        )}
      </div>

      {/* Add card form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-4"
          >
            <div className="card-elevated p-4 space-y-3 border-2 border-primary-100">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">Nuova carta</h3>
                <button onClick={() => setShowForm(false)} className="p-1">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Numero carta</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  className="input-field font-mono tracking-wider"
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Scadenza</label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    className="input-field"
                    placeholder="MM/AA"
                    maxLength={5}
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs text-gray-500 mb-1">CVV</label>
                  <input
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="input-field"
                    placeholder="•••"
                    maxLength={4}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Titolare carta</label>
                <input
                  type="text"
                  value={holder}
                  onChange={(e) => setHolder(e.target.value.toUpperCase())}
                  className="input-field"
                  placeholder="NOME COGNOME"
                />
              </div>

              <button
                onClick={handleAdd}
                disabled={!cardNumber || !expiry || !cvv || !holder || saving || success}
                className="btn-primary w-full disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Verifica in corso...
                  </>
                ) : success ? (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring' }}
                    >
                      <Check size={18} />
                    </motion.div>
                    Carta aggiunta!
                  </>
                ) : (
                  'Aggiungi carta'
                )}
              </button>

              <p className="text-[10px] text-gray-300 text-center">
                Demo — nessun dato reale viene salvato
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add button */}
      {!showForm && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowForm(true)}
          className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 font-medium text-sm flex items-center justify-center gap-2 hover:border-primary-300 hover:text-primary-500 transition-colors"
        >
          <Plus size={18} />
          Aggiungi carta
        </motion.button>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-5 py-2.5 rounded-full shadow-lg z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
