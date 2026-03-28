'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, Send, MapPin, Euro, Clock, AlertTriangle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

const CATEGORIES = [
  { key: 'CLEANING', label: 'Pulizie', icon: '✨' },
  { key: 'TUTORING', label: 'Ripetizioni', icon: '📚' },
  { key: 'BABYSITTING', label: 'Babysitting', icon: '👶' },
  { key: 'PERSONAL_CARE', label: 'Cura personale', icon: '💆' },
  { key: 'PET_SITTING', label: 'Pet Sitting', icon: '🐾' },
];

const CITIES = [
  'Milano', 'Roma', 'Torino', 'Napoli', 'Firenze', 'Bologna', 'Venezia', 'Padova', 'Genova',
];

type FormData = {
  category: string;
  title: string;
  description: string;
  budget: string;
  budgetType: 'hourly' | 'fixed';
  urgent: boolean;
  city: string;
  address: string;
};

export default function CreateJobPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'preview' | 'success'>('form');
  const [form, setForm] = useState<FormData>({
    category: '',
    title: '',
    description: '',
    budget: '',
    budgetType: 'hourly',
    urgent: false,
    city: '',
    address: '',
  });

  const isValid = form.category && form.title.length >= 5 && form.description.length >= 20 && form.budget && form.city;

  const handlePublish = () => {
    setStep('success');
    setTimeout(() => router.push('/jobs'), 2500);
  };

  const CATEGORY_ICONS: Record<string, string> = {
    TUTORING: '📚', CLEANING: '✨', PERSONAL_CARE: '💆', BABYSITTING: '👶', PET_SITTING: '🐾',
  };

  if (step === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-emerald-50 to-white">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center p-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"
          >
            <Check size={40} className="text-emerald-500" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Annuncio pubblicato!</h2>
          <p className="text-gray-500 text-sm">I professionisti nella tua zona saranno notificati</p>
          <p className="text-gray-300 text-xs mt-3">Reindirizzamento...</p>
        </motion.div>
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div className="animate-fade-up">
        <div className="gradient-hero px-5 pt-14 pb-8 rounded-b-[2.5rem]">
          <div className="max-w-lg mx-auto">
            <button onClick={() => setStep('form')} className="text-white/80 mb-3 flex items-center gap-1 text-sm">
              <ArrowLeft size={18} /> Modifica
            </button>
            <div className="flex items-center gap-3">
              <Eye size={24} className="text-white" />
              <h1 className="text-2xl font-bold text-white">Anteprima annuncio</h1>
            </div>
          </div>
        </div>

        <div className="page-container -mt-4">
          <div className="card-elevated p-5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{CATEGORY_ICONS[form.category] || '📋'}</span>
              <div className="flex-1">
                <h2 className="font-bold text-lg text-gray-900">{form.title}</h2>
                <p className="text-xs text-gray-400">{CATEGORIES.find(c => c.key === form.category)?.label}</p>
              </div>
              {form.urgent && (
                <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                  <AlertTriangle size={12} /> Urgente
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-4">{form.description}</p>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin size={14} /> {form.city}{form.address ? `, ${form.address}` : ''}
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Euro size={16} className="text-accent-600" />
                <span className="text-lg font-bold text-accent-600">
                  {form.budget}{form.budgetType === 'hourly' ? '/ora' : ' fisso'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={12} /> Appena pubblicato
              </div>
            </div>
          </div>

          <button onClick={handlePublish} className="btn-primary w-full flex items-center justify-center gap-2 mb-3">
            <Send size={18} /> Pubblica annuncio
          </button>
          <button onClick={() => setStep('form')} className="btn-secondary w-full">
            Modifica
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <div className="gradient-hero px-5 pt-14 pb-8 rounded-b-[2.5rem]">
        <div className="max-w-lg mx-auto">
          <button onClick={() => router.push('/jobs')} className="text-white/80 mb-3 flex items-center gap-1 text-sm">
            <ArrowLeft size={18} /> Torna agli annunci
          </button>
          <h1 className="text-2xl font-bold text-white">Pubblica un annuncio</h1>
          <p className="text-white/70 text-sm mt-1">Descrivi il servizio di cui hai bisogno</p>
        </div>
      </div>

      <div className="page-container -mt-4">
        {/* Category */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Categoria *</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setForm({ ...form, category: cat.key })}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all',
                  form.category === cat.key
                    ? 'bg-primary-50 border-primary-300 text-primary-700 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                )}
              >
                <span>{cat.icon}</span> {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Titolo *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="es. Cercasi babysitter per 2 bambini"
            className="w-full bg-white rounded-xl px-4 py-3 text-sm border border-gray-200 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
            maxLength={80}
          />
          <p className="text-xs text-gray-300 mt-1 text-right">{form.title.length}/80</p>
        </div>

        {/* Description */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Descrizione *</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descrivi in dettaglio il servizio di cui hai bisogno, gli orari, eventuali requisiti..."
            rows={4}
            className="w-full bg-white rounded-xl px-4 py-3 text-sm border border-gray-200 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 resize-none"
            maxLength={500}
          />
          <p className="text-xs text-gray-300 mt-1 text-right">{form.description.length}/500</p>
        </div>

        {/* Budget */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Budget *</label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Euro size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                placeholder="0"
                className="w-full bg-white rounded-xl pl-9 pr-4 py-3 text-sm border border-gray-200 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
                min={1}
              />
            </div>
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setForm({ ...form, budgetType: 'hourly' })}
                className={clsx(
                  'px-4 py-2 rounded-lg text-xs font-medium transition-all',
                  form.budgetType === 'hourly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                )}
              >
                /ora
              </button>
              <button
                onClick={() => setForm({ ...form, budgetType: 'fixed' })}
                className={clsx(
                  'px-4 py-2 rounded-lg text-xs font-medium transition-all',
                  form.budgetType === 'fixed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                )}
              >
                Fisso
              </button>
            </div>
          </div>
        </div>

        {/* City */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Città *</label>
          <select
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="w-full bg-white rounded-xl px-4 py-3 text-sm border border-gray-200 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
          >
            <option value="">Seleziona una città</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Address */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Indirizzo / Zona (opzionale)</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="es. Zona Navigli"
            className="w-full bg-white rounded-xl px-4 py-3 text-sm border border-gray-200 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        {/* Urgent toggle */}
        <div className="mb-8">
          <button
            onClick={() => setForm({ ...form, urgent: !form.urgent })}
            className={clsx(
              'w-full flex items-center justify-between p-4 rounded-xl border transition-all',
              form.urgent
                ? 'bg-red-50 border-red-200'
                : 'bg-white border-gray-200'
            )}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className={form.urgent ? 'text-red-500' : 'text-gray-400'} />
              <div className="text-left">
                <p className={`text-sm font-medium ${form.urgent ? 'text-red-700' : 'text-gray-700'}`}>Urgente</p>
                <p className="text-xs text-gray-400">Il tuo annuncio sarà evidenziato</p>
              </div>
            </div>
            <div className={clsx(
              'w-11 h-6 rounded-full transition-all relative',
              form.urgent ? 'bg-red-500' : 'bg-gray-200'
            )}>
              <div className={clsx(
                'w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all',
                form.urgent ? 'left-[22px]' : 'left-0.5'
              )} />
            </div>
          </button>
        </div>

        {/* Submit */}
        <button
          onClick={() => setStep('preview')}
          disabled={!isValid}
          className="btn-primary w-full flex items-center justify-center gap-2 mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Eye size={18} /> Anteprima
        </button>
        <p className="text-xs text-center text-gray-300 mb-20">* Campi obbligatori</p>
      </div>
    </div>
  );
}
