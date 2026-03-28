'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, MapPin, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_ADDRESSES } from '@/lib/mock-data';

export default function AddressesPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState(MOCK_ADDRESSES);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [cap, setCap] = useState('');
  const [toast, setToast] = useState('');

  const handleAdd = () => {
    if (!label || !address || !city) return;
    const newAddr = {
      id: 'addr-' + Date.now(),
      label,
      icon: label.toLowerCase().includes('casa') ? '🏠' : label.toLowerCase().includes('ufficio') ? '🏢' : '📍',
      address,
      city,
      cap,
      isDefault: addresses.length === 0,
    };
    setAddresses([...addresses, newAddr]);
    setLabel('');
    setAddress('');
    setCity('');
    setCap('');
    setShowForm(false);
    setToast('Indirizzo aggiunto');
    setTimeout(() => setToast(''), 2000);
  };

  const handleDelete = (id: string) => {
    setAddresses(addresses.filter((a) => a.id !== id));
    setToast('Indirizzo rimosso');
    setTimeout(() => setToast(''), 2000);
  };

  const handleSetDefault = (id: string) => {
    setAddresses(addresses.map((a) => ({ ...a, isDefault: a.id === id })));
  };

  return (
    <div className="page-container pt-4 pb-28">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">Indirizzi salvati</h1>
      </div>

      {/* Address list */}
      <div className="space-y-3">
        <AnimatePresence>
          {addresses.map((addr, i) => (
            <motion.div
              key={addr.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: i * 0.05 }}
              className="card-elevated p-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{addr.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{addr.label}</h3>
                    {addr.isDefault && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-600">
                        Predefinito
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{addr.address}</p>
                  <p className="text-sm text-gray-400">{addr.cap} {addr.city}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!addr.isDefault && (
                    <button
                      onClick={() => handleSetDefault(addr.id)}
                      className="p-2 text-gray-300 hover:text-primary-500 transition-colors"
                      title="Imposta come predefinito"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {addresses.length === 0 && !showForm && (
          <div className="text-center py-12">
            <MapPin size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Nessun indirizzo salvato</p>
          </div>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-4"
          >
            <div className="card-elevated p-4 space-y-3 border-2 border-primary-100">
              <h3 className="font-semibold text-gray-700">Nuovo indirizzo</h3>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="input-field"
                placeholder="Nome (es. Casa, Ufficio, Palestra)"
              />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input-field"
                placeholder="Via e numero civico"
              />
              <div className="flex gap-3">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="input-field flex-1"
                  placeholder="Città"
                />
                <input
                  type="text"
                  value={cap}
                  onChange={(e) => setCap(e.target.value)}
                  className="input-field w-24"
                  placeholder="CAP"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm"
                >
                  Annulla
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!label || !address || !city}
                  className="flex-1 btn-primary disabled:opacity-40"
                >
                  Salva
                </button>
              </div>
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
          Aggiungi indirizzo
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
