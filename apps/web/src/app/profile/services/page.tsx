'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { PageLoading } from '@/components/loading-spinner';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { clsx } from 'clsx';

export default function ManageServicesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [allServices, setAllServices] = useState<any[]>([]);
  const [myServices, setMyServices] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      Promise.all([
        api.getServices(),
        api.getMyProfessionalProfile(),
      ]).then(([services, profile]) => {
        setAllServices(services);
        setMyServices(profile.services || []);
      }).catch(() => {})
        .finally(() => setLoadingData(false));
    }
  }, [user]);

  const myServiceIds = new Set(myServices.map((ps: any) => ps.service.id));

  const handleAdd = async (serviceId: string) => {
    try {
      const result = await api.addService(serviceId);
      setMyServices((prev) => [...prev, result]);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemove = async (serviceId: string) => {
    try {
      await api.removeService(serviceId);
      setMyServices((prev) => prev.filter((ps: any) => ps.service.id !== serviceId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading || loadingData) return <PageLoading />;

  return (
    <div className="page-container pt-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">My Services</h1>
      </div>

      {/* My services */}
      {myServices.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Active ({myServices.length})
          </h2>
          <div className="space-y-2">
            {myServices.map((ps: any) => (
              <div key={ps.id} className="card p-3 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {ps.service.icon} {ps.service.name}
                </span>
                <button
                  onClick={() => handleRemove(ps.service.id)}
                  className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available to add */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Available Services
      </h2>
      <div className="space-y-2">
        {allServices
          .filter((s) => !myServiceIds.has(s.id))
          .map((s) => (
            <div key={s.id} className="card p-3 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">{s.icon} {s.name}</span>
                <p className="text-xs text-gray-400">{s.category}</p>
              </div>
              <button
                onClick={() => handleAdd(s.id)}
                className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg"
              >
                <Plus size={16} />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
