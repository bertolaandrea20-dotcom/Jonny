'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { PageLoading } from '@/components/loading-spinner';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Slot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export default function AvailabilityPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      api.getMyProfessionalProfile()
        .then((p: any) => {
          setSlots(
            (p.availability || []).map((a: any) => ({
              dayOfWeek: a.dayOfWeek,
              startTime: a.startTime,
              endTime: a.endTime,
            })),
          );
        })
        .catch(() => {})
        .finally(() => setLoadingData(false));
    }
  }, [user]);

  const addSlot = () => {
    setSlots([...slots, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: keyof Slot, value: string | number) => {
    setSlots(slots.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.setAvailability(slots);
      setSaved(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingData) return <PageLoading />;

  return (
    <div className="page-container pt-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold flex-1">Availability</h1>
        <button onClick={addSlot} className="p-2 text-primary-600">
          <Plus size={20} />
        </button>
      </div>

      {slots.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-gray-500">No availability set</p>
          <button onClick={addSlot} className="btn-primary mt-4">
            Add Time Slot
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map((slot, i) => (
            <div key={i} className="card p-3">
              <div className="flex items-center gap-2 mb-2">
                <select
                  value={slot.dayOfWeek}
                  onChange={(e) => updateSlot(i, 'dayOfWeek', parseInt(e.target.value))}
                  className="input-field flex-1 py-2 text-sm"
                >
                  {DAYS.map((day, di) => (
                    <option key={di} value={di}>{day}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeSlot(i)}
                  className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => updateSlot(i, 'startTime', e.target.value)}
                  className="input-field flex-1 py-2 text-sm"
                />
                <span className="text-gray-400 text-sm">to</span>
                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => updateSlot(i, 'endTime', e.target.value)}
                  className="input-field flex-1 py-2 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {slots.length > 0 && (
        <div className="mt-6">
          {saved && (
            <div className="bg-green-50 text-green-700 text-sm px-4 py-2.5 rounded-xl mb-3">
              Availability saved!
            </div>
          )}
          <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      )}
    </div>
  );
}
