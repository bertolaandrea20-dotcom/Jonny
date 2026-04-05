'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Star, Shield, TrendingUp, Euro, Users, Clock,
  CheckCircle2, ChevronDown, ChevronUp, ArrowRight, Sparkles,
  MapPin, MessageCircle, Calendar, Zap, Heart, Globe,
} from 'lucide-react';

// ─── Google Sheets Integration ───
// ISTRUZIONI PER COLLEGARE GOOGLE SHEETS:
//
// 1. Crea un Google Sheet con colonne: Timestamp | Nome | Email | Ruolo
// 2. Vai su Estensioni > Apps Script
// 3. Incolla questo codice:
//
// function doPost(e) {
//   var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
//   var data = JSON.parse(e.postData.contents);
//   sheet.appendRow([data.timestamp, data.name, data.email, data.role]);
//   return ContentService.createTextOutput(JSON.stringify({result: 'ok'}))
//     .setMimeType(ContentService.MimeType.JSON);
// }
//
// 4. Pubblica: Deploy > New deployment > Web app > "Chiunque" > Pubblica
// 5. Copia l'URL e incollalo qui sotto:
const GOOGLE_SCRIPT_URL = '';
// Se vuoto, il form funziona in modalità demo (mostra successo senza inviare)

const FEATURES_CLIENT = [
  { icon: Search, title: 'Cerca', desc: 'Trova professionisti verificati nella tua zona in pochi secondi' },
  { icon: Shield, title: 'Sicuro', desc: 'Pagamento in escrow, identità verificate e recensioni reali' },
  { icon: Calendar, title: 'Prenota', desc: 'Scegli data, ora e servizio. Conferma istantanea' },
  { icon: Star, title: 'Recensisci', desc: 'Recensioni bidirezionali per una community di fiducia' },
];

const FEATURES_PRO = [
  { icon: Users, title: 'Clienti', desc: 'Ricevi richieste da clienti verificati nella tua zona' },
  { icon: Euro, title: 'Guadagna', desc: 'Tariffa trasparente, pagamento sicuro, zero sorprese' },
  { icon: TrendingUp, title: 'Cresci', desc: 'Insights premium e analytics per far crescere la tua attività' },
  { icon: Zap, title: 'Visibilità', desc: 'Profilo in evidenza, badge verificato e matching intelligente' },
];

const STEPS = [
  { num: '01', title: 'Registrati', desc: 'Crea il tuo profilo in 2 minuti, gratis', icon: '👤' },
  { num: '02', title: 'Cerca o Ricevi', desc: 'Trova professionisti o ricevi richieste dai clienti', icon: '🔍' },
  { num: '03', title: 'Prenota & Paga', desc: 'Pagamento sicuro in escrow, rilasciato dopo il servizio', icon: '💳' },
  { num: '04', title: 'Recensisci', desc: 'Entrambi lasciano una recensione. La fiducia cresce', icon: '⭐' },
];

const FAQS = [
  { q: 'Quanto costa usare Service to U?', a: 'Per i clienti è completamente gratuito. Per i professionisti, applichiamo una commissione del 15% sulle prenotazioni. Il piano Premium a €14.99/mese offre visibilità extra e zero commissioni sulle prime 5 prenotazioni mensili.' },
  { q: 'Come vengono verificati i professionisti?', a: 'Ogni professionista passa un processo di verifica in 5 step: email, telefono, documento d\'identità, selfie di verifica e prova di residenza. Solo i profili completamente verificati ottengono il badge verde.' },
  { q: 'Il pagamento è sicuro?', a: 'Sì. Utilizziamo un sistema di escrow: il pagamento viene trattenuto fino al completamento del servizio. Solo dopo la conferma del cliente, il professionista riceve il compenso. In caso di problemi, hai sempre diritto a un rimborso.' },
  { q: 'Quando sarà disponibile nella mia città?', a: 'Stiamo lanciando inizialmente a Milano, Roma e Torino. Iscriviti alla waitlist per essere tra i primi a sapere quando arriveremo nella tua città e per ottenere un accesso anticipato con vantaggi esclusivi.' },
];

const CATEGORIES = [
  { icon: '🧹', name: 'Pulizie' },
  { icon: '📚', name: 'Ripetizioni' },
  { icon: '💆', name: 'Benessere' },
  { icon: '👶', name: 'Babysitting' },
  { icon: '🐾', name: 'Pet Sitting' },
  { icon: '💇', name: 'Parrucchiere' },
];

export default function LandingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('CLIENT');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;

    setSubmitting(true);

    try {
      if (GOOGLE_SCRIPT_URL) {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            name,
            email,
            role,
          }),
        });
      }
    } catch {
      // Silently fail — no-cors mode doesn't return readable response
    }

    // Always show success (no-cors doesn't allow reading response)
    setSubmitted(true);
    setSubmitting(false);
  };

  const scrollToForm = () => {
    document.getElementById('waitlist-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        <div className="bg-gradient-to-br from-primary-500 via-primary-400 to-orange-400 px-5 pt-14 pb-20 rounded-b-[3rem]">
          {/* Floating decorative elements */}
          <div className="absolute top-8 right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-12 left-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />

          <div className="max-w-lg mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full mb-6">
                <Sparkles size={14} className="text-white" />
                <span className="text-white/90 text-xs font-semibold">Lancio 2026 — Iscriviti ora</span>
              </div>

              <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight">
                Service to U
              </h1>
              <p className="text-lg text-white/90 mt-3 font-medium leading-relaxed">
                I servizi di cui hai bisogno,<br />a portata di tap.
              </p>
              <p className="text-sm text-white/70 mt-2 max-w-xs mx-auto">
                Pulizie, ripetizioni, babysitting, benessere e molto altro. Professionisti verificati, vicino a te.
              </p>

              <div className="flex gap-3 justify-center mt-8">
                <button
                  onClick={scrollToForm}
                  className="bg-white text-primary-600 font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-primary-800/20 active:scale-[0.97] transition-transform text-sm flex items-center gap-2"
                >
                  Unisciti alla waitlist
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="bg-white/20 backdrop-blur-sm text-white font-semibold px-6 py-3.5 rounded-2xl border border-white/30 active:scale-[0.97] transition-transform text-sm"
                >
                  Prova la demo
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── CATEGORIES ─── */}
      <section className="px-5 -mt-8 relative z-20">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/60 border border-gray-100/50 p-5">
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => (
                <div key={cat.name} className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-50 to-orange-50 flex items-center justify-center mx-auto mb-1.5">
                    <span className="text-xl">{cat.icon}</span>
                  </div>
                  <p className="text-xs font-medium text-gray-600">{cat.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF ─── */}
      <section className="px-5 mt-10">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-3 gap-3"
          >
            <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-primary-50 to-orange-50 border border-primary-100/50">
              <p className="text-2xl font-extrabold text-primary-600">500+</p>
              <p className="text-[11px] text-gray-500 font-medium mt-1">Professionisti in attesa</p>
            </div>
            <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100/50">
              <p className="text-2xl font-extrabold text-amber-600">14</p>
              <p className="text-[11px] text-gray-500 font-medium mt-1">Categorie di servizi</p>
            </div>
            <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100/50">
              <p className="text-2xl font-extrabold text-emerald-600">4.8⭐</p>
              <p className="text-[11px] text-gray-500 font-medium mt-1">Rating medio demo</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES: CLIENT ─── */}
      <section className="px-5 mt-12">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-xs font-bold text-primary-500 uppercase tracking-widest mb-2">Per i clienti</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Trova chi ti serve, subito</h2>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            {FEATURES_CLIENT.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-orange-100 flex items-center justify-center mb-3">
                  <f.icon size={18} className="text-primary-600" />
                </div>
                <h3 className="font-bold text-sm text-gray-900">{f.title}</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES: PRO ─── */}
      <section className="px-5 mt-12">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-xs font-bold text-accent-500 uppercase tracking-widest mb-2">Per i professionisti</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Fai crescere la tua attività</h2>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            {FEATURES_PRO.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center mb-3">
                  <f.icon size={18} className="text-amber-600" />
                </div>
                <h3 className="font-bold text-sm text-gray-900">{f.title}</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COME FUNZIONA ─── */}
      <section className="px-5 mt-12">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Come funziona</h2>
          </motion.div>

          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50/80 border border-gray-100"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-orange-400 flex items-center justify-center flex-shrink-0 shadow-md shadow-primary-200/50">
                  <span className="text-xl">{step.icon}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-primary-400">{step.num}</span>
                    <h3 className="font-bold text-sm text-gray-900">{step.title}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WAITLIST FORM ─── */}
      <section id="waitlist-form" className="px-5 mt-14 mb-4">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-primary-500 via-primary-400 to-orange-400 rounded-3xl p-6 shadow-xl shadow-primary-200/40"
          >
            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-extrabold text-white">Unisciti alla waitlist</h2>
                    <p className="text-sm text-white/80 mt-1">
                      Sii tra i primi ad accedere. Niente spam, promesso.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Il tuo nome"
                      required
                      className="w-full px-4 py-3.5 rounded-2xl bg-white/95 text-gray-900 placeholder-gray-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="La tua email"
                      required
                      className="w-full px-4 py-3.5 rounded-2xl bg-white/95 text-gray-900 placeholder-gray-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-white/95 text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50 appearance-none"
                    >
                      <option value="CLIENT">Sono un cliente</option>
                      <option value="PROFESSIONAL">Sono un professionista</option>
                      <option value="BUSINESS">Rappresento un'azienda</option>
                    </select>

                    <button
                      type="submit"
                      disabled={submitting || !email || !name}
                      className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-2xl shadow-lg active:scale-[0.97] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Iscrivimi alla waitlist
                        </>
                      )}
                    </button>
                  </form>

                  <p className="text-[11px] text-white/60 text-center mt-3">
                    Iscrivendoti accetti di ricevere aggiornamenti su Service to U
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className="text-center py-6"
                >
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-white" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white">Sei dentro! 🎉</h3>
                  <p className="text-sm text-white/80 mt-2 max-w-xs mx-auto">
                    Ti abbiamo aggiunto alla waitlist. Riceverai un'email quando Service to U sarà disponibile nella tua zona.
                  </p>
                  <button
                    onClick={() => router.push('/login')}
                    className="mt-6 bg-white text-primary-600 font-bold px-6 py-3 rounded-2xl shadow-lg active:scale-[0.97] transition-transform text-sm inline-flex items-center gap-2"
                  >
                    Prova la demo intanto
                    <ArrowRight size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="px-5 mt-10 mb-8">
        <div className="max-w-lg mx-auto">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Domande frequenti</h2>

          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="text-sm font-semibold text-gray-900 pr-4">{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                  )}
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="text-sm text-gray-500 px-4 pb-4 leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-gray-900 px-5 py-10 rounded-t-3xl mt-4">
        <div className="max-w-lg mx-auto text-center">
          <h3 className="text-lg font-extrabold text-white">Service to U</h3>
          <p className="text-sm text-gray-400 mt-1">I servizi di cui hai bisogno, a portata di tap.</p>

          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={scrollToForm}
              className="bg-primary-500 text-white font-semibold px-5 py-2.5 rounded-2xl text-sm active:scale-[0.97] transition-transform"
            >
              Waitlist
            </button>
            <button
              onClick={() => router.push('/login')}
              className="bg-gray-800 text-gray-300 font-semibold px-5 py-2.5 rounded-2xl text-sm border border-gray-700 active:scale-[0.97] transition-transform"
            >
              Demo
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              © 2026 Service to U. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
