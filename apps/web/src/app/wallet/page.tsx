'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageLoading } from '@/components/loading-spinner';
import { ArrowLeft, Wallet, CreditCard, Gift, Shield, CheckCircle2, AlertCircle, ChevronRight, Plus, ArrowUpRight, QrCode, Building2, Euro } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Welfare providers ───

const WELFARE_PROVIDERS = [
  { id: 'edenred', name: 'Edenred', subtitle: 'Ticket Welfare', icon: '🏷️', color: 'from-red-500 to-rose-600', categories: ['CLEANING', 'BABYSITTING', 'TUTORING'] },
  { id: 'sodexo', name: 'Sodexo', subtitle: 'Pass Welfare', icon: '💳', color: 'from-blue-500 to-indigo-600', categories: ['CLEANING', 'PERSONAL_CARE', 'BABYSITTING'] },
  { id: 'pellegrini', name: 'Pellegrini', subtitle: 'Welfare Card', icon: '🟢', color: 'from-green-500 to-emerald-600', categories: ['BABYSITTING', 'TUTORING', 'PET_SITTING'] },
  { id: 'day', name: 'Day', subtitle: 'Up Welfare', icon: '🔵', color: 'from-cyan-500 to-blue-600', categories: ['CLEANING', 'PERSONAL_CARE', 'TUTORING', 'BABYSITTING'] },
  { id: 'easy-welfare', name: 'Easy Welfare', subtitle: 'by Eudaimon', icon: '🟣', color: 'from-purple-500 to-violet-600', categories: ['CLEANING', 'TUTORING', 'BABYSITTING', 'PET_SITTING', 'PERSONAL_CARE'] },
];

const CATEGORY_LABELS: Record<string, string> = {
  CLEANING: 'Pulizie',
  TUTORING: 'Ripetizioni',
  BABYSITTING: 'Babysitting',
  PERSONAL_CARE: 'Cura personale',
  PET_SITTING: 'Pet Sitting',
};

// ─── Mock transactions ───

const MOCK_TRANSACTIONS = [
  { id: 'tx-1', date: '2026-03-25', description: 'Pulizia appartamento - Marie D.', amount: -60, type: 'payment' as const },
  { id: 'tx-2', date: '2026-03-20', description: 'Ricarica credito Edenred', amount: 200, type: 'topup' as const },
  { id: 'tx-3', date: '2026-03-15', description: 'Ripetizioni matematica - Lucas M.', amount: -45, type: 'payment' as const },
  { id: 'tx-4', date: '2026-03-10', description: 'Babysitting - Sophie B.', amount: -75, type: 'payment' as const },
  { id: 'tx-5', date: '2026-03-01', description: 'Ricarica credito aziendale', amount: 500, type: 'topup' as const },
];

export default function WalletPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [connectedProvider, setConnectedProvider] = useState<string | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [balance] = useState(520.00);
  const [showTransactions, setShowTransactions] = useState(false);

  if (loading || !user) return <PageLoading />;

  const handleConnect = async (providerId: string) => {
    setConnecting(true);
    // Simulate connection
    await new Promise((r) => setTimeout(r, 1500));
    setConnectedProvider(providerId);
    setConnecting(false);
    setShowConnect(false);
  };

  const provider = connectedProvider
    ? WELFARE_PROVIDERS.find((p) => p.id === connectedProvider)
    : null;

  return (
    <div className="animate-fade-up min-h-screen bg-gray-50/80">
      {/* Header */}
      <div className="gradient-hero px-5 pt-12 pb-8 rounded-b-[2.5rem]" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)' }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-white">Wallet & Welfare</h1>
          </div>

          {/* Balance card */}
          <div className="bg-white/15 backdrop-blur-md rounded-3xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-white/80" />
                <span className="text-sm text-white/70 font-medium">Credito disponibile</span>
              </div>
              {provider && (
                <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} /> {provider.name}
                </span>
              )}
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              €{balance.toFixed(2)}
            </p>
            <p className="text-sm text-white/60">
              {provider
                ? `Collegato a ${provider.name} ${provider.subtitle}`
                : 'Collega il tuo welfare per iniziare'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 -mt-4">
        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => setShowConnect(true)}
            className="card-elevated p-4 flex flex-col items-center gap-2 hover:shadow-lg transition-all"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
              <Plus size={20} className="text-violet-600" />
            </div>
            <span className="text-xs font-medium text-gray-600 text-center">
              {connectedProvider ? 'Cambia' : 'Collega'}
            </span>
          </button>
          <button
            onClick={() => setShowTransactions(!showTransactions)}
            className="card-elevated p-4 flex flex-col items-center gap-2 hover:shadow-lg transition-all"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
              <ArrowUpRight size={20} className="text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-gray-600">Movimenti</span>
          </button>
          <button className="card-elevated p-4 flex flex-col items-center gap-2 hover:shadow-lg transition-all">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
              <QrCode size={20} className="text-amber-600" />
            </div>
            <span className="text-xs font-medium text-gray-600">QR Code</span>
          </button>
        </div>

        {/* Connected provider info */}
        {provider && (
          <div className="card-elevated p-5 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${provider.color} flex items-center justify-center`}>
                <span className="text-2xl">{provider.icon}</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{provider.name}</p>
                <p className="text-sm text-gray-400">{provider.subtitle}</p>
              </div>
              <div className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-xs font-semibold">
                <CheckCircle2 size={14} /> Attivo
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Servizi coperti</p>
              <div className="flex flex-wrap gap-1.5">
                {provider.categories.map((cat) => (
                  <span key={cat} className="text-xs bg-violet-50 text-violet-600 px-2.5 py-1 rounded-full font-medium">
                    {CATEGORY_LABELS[cat] || cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Connect welfare CTA (if not connected) */}
        {!connectedProvider && (
          <button
            onClick={() => setShowConnect(true)}
            className="w-full card-elevated p-6 mb-6 text-left hover:shadow-lg transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30">
                <Gift size={28} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-lg">Collega il tuo Welfare</p>
                <p className="text-sm text-gray-400 mt-0.5">Usa i tuoi crediti welfare per pagare i servizi</p>
              </div>
              <ChevronRight className="text-gray-300 group-hover:text-primary-500 transition-colors" />
            </div>
          </button>
        )}

        {/* Transactions */}
        <AnimatePresence>
          {showTransactions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="card-elevated p-5">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ArrowUpRight size={16} /> Ultimi movimenti
                </h3>
                <div className="space-y-3">
                  {MOCK_TRANSACTIONS.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          'w-9 h-9 rounded-xl flex items-center justify-center',
                          tx.type === 'topup' ? 'bg-green-50' : 'bg-gray-100',
                        )}>
                          {tx.type === 'topup'
                            ? <Plus size={16} className="text-green-500" />
                            : <Euro size={16} className="text-gray-400" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{tx.description}</p>
                          <p className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString('it-IT')}</p>
                        </div>
                      </div>
                      <span className={clsx(
                        'text-sm font-bold',
                        tx.amount > 0 ? 'text-green-600' : 'text-gray-700',
                      )}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* How welfare works */}
        <div className="card-elevated p-5 mb-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield size={16} className="text-violet-500" /> Come funziona
          </h3>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Collega il provider', desc: 'Scegli il tuo fornitore welfare aziendale', color: 'from-violet-400 to-purple-500' },
              { step: '2', title: 'Verifica il saldo', desc: 'Controlla i crediti disponibili e i servizi coperti', color: 'from-blue-400 to-indigo-500' },
              { step: '3', title: 'Paga con welfare', desc: 'Al momento del pagamento, scegli "Credito Welfare"', color: 'from-emerald-400 to-teal-500' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-bold text-sm">{item.step}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="card-elevated p-5 mb-24">
          <h3 className="font-bold text-gray-900 mb-3">Domande frequenti</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-700">Quali servizi posso pagare con il welfare?</p>
              <p className="text-xs text-gray-400 mt-0.5">Dipende dal tuo provider. In genere: babysitting, ripetizioni, pulizie, cura della persona e pet sitting.</p>
            </div>
            <div className="border-t border-gray-50 pt-3">
              <p className="text-sm font-semibold text-gray-700">Il credito ha una scadenza?</p>
              <p className="text-xs text-gray-400 mt-0.5">Sì, solitamente il credito welfare scade il 31 dicembre di ogni anno. Controlla con il tuo provider.</p>
            </div>
            <div className="border-t border-gray-50 pt-3">
              <p className="text-sm font-semibold text-gray-700">Posso combinare welfare e carta?</p>
              <p className="text-xs text-gray-400 mt-0.5">Sì! Se il credito welfare non copre tutto l&#39;importo, puoi pagare la differenza con carta.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Connect modal */}
      <AnimatePresence>
        {showConnect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end"
            onClick={() => !connecting && setShowConnect(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 pb-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
              <h2 className="text-xl font-bold text-gray-900 mb-1">Collega Welfare</h2>
              <p className="text-sm text-gray-400 mb-6">Seleziona il tuo fornitore welfare aziendale</p>

              <div className="space-y-3">
                {WELFARE_PROVIDERS.map((wp) => (
                  <button
                    key={wp.id}
                    onClick={() => handleConnect(wp.id)}
                    disabled={connecting}
                    className={clsx(
                      'w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left',
                      connecting
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:shadow-md hover:border-violet-200 active:scale-[0.98]',
                      connectedProvider === wp.id
                        ? 'border-violet-300 bg-violet-50'
                        : 'border-gray-100 bg-white',
                    )}
                  >
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${wp.color} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-2xl">{wp.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{wp.name}</p>
                      <p className="text-sm text-gray-400">{wp.subtitle}</p>
                      <div className="flex gap-1 mt-1">
                        {wp.categories.slice(0, 3).map((cat) => (
                          <span key={cat} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                            {CATEGORY_LABELS[cat]}
                          </span>
                        ))}
                        {wp.categories.length > 3 && (
                          <span className="text-[10px] text-gray-400">+{wp.categories.length - 3}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-300" />
                  </button>
                ))}
              </div>

              {connecting && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-violet-600">
                  <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                  Collegamento in corso...
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
