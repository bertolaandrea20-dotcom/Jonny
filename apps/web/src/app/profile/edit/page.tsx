'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { PageLoading } from '@/components/loading-spinner';
import { ArrowLeft } from 'lucide-react';

export default function EditProfilePage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [serviceRadius, setServiceRadius] = useState('');
  const [age, setAge] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isPro = user?.role === 'PROFESSIONAL';

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setPhone(user.phone || '');
    }
    if (isPro) {
      api.getMyProfessionalProfile().then((p: any) => {
        setBio(p.bio || '');
        setHourlyRate(p.hourlyRate?.toString() || '');
        setServiceRadius(p.serviceRadius?.toString() || '10');
        setAge(p.age?.toString() || '');
      }).catch(() => {});
    }
  }, [user, isPro]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.updateProfile({ firstName, lastName, phone: phone || undefined });
      if (isPro) {
        await api.updateProfessionalProfile({
          bio: bio || undefined,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
          serviceRadius: serviceRadius ? parseFloat(serviceRadius) : undefined,
          age: age ? parseInt(age) : undefined,
        });
      }
      await refreshUser();
      setSaved(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return <PageLoading />;

  return (
    <div className="page-container pt-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">Edit Profile</h1>
      </div>

      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input-field" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="input-field" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder="+33..." />
        </div>

        {isPro && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input-field" rows={3} placeholder="Tell clients about yourself..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="input-field" min={18} max={100} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hourly rate (EUR)</label>
              <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="input-field" min={0} step={0.5} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service radius (km)</label>
              <input type="number" value={serviceRadius} onChange={(e) => setServiceRadius(e.target.value)} className="input-field" min={1} max={100} />
            </div>
          </>
        )}

        {saved && (
          <div className="bg-green-50 text-green-700 text-sm px-4 py-2.5 rounded-xl">
            Profile updated successfully!
          </div>
        )}

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
