'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageLoading } from '@/components/loading-spinner';
import { ArrowLeft, MapPin, Clock, Flame } from 'lucide-react';
import { MOCK_JOB_LISTINGS } from '@/lib/mock-data';
import { clsx } from 'clsx';

const CATEGORY_ICONS: Record<string, string> = {
  TUTORING: '📚', CLEANING: '✨', PERSONAL_CARE: '💆', BABYSITTING: '👶', PET_SITTING: '🐾',
};

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'CLEANING', label: 'Cleaning' },
  { key: 'TUTORING', label: 'Tutoring' },
  { key: 'BABYSITTING', label: 'Babysitting' },
  { key: 'PERSONAL_CARE', label: 'Personal Care' },
  { key: 'PET_SITTING', label: 'Pet Sitting' },
];

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function JobsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading || !user) return <PageLoading />;

  const jobs = filter
    ? MOCK_JOB_LISTINGS.filter((j) => j.category === filter)
    : MOCK_JOB_LISTINGS;

  const sorted = [...jobs].sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

  return (
    <div className="animate-fade-up">
      {/* Hero */}
      <div className="gradient-hero px-5 pt-14 pb-10 rounded-b-[2.5rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => router.back()} className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
              <ArrowLeft size={18} className="text-white" />
            </button>
            <h1 className="text-2xl font-bold text-white">Job Offers</h1>
          </div>
          <p className="text-white/70 text-sm">Browse service requests near you</p>
        </div>
      </div>

      <div className="page-container -mt-4">
        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 -mx-5 px-5 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={clsx(
                'flex-shrink-0 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200',
                filter === f.key
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/20'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100 shadow-sm',
              )}
            >
              {f.key && CATEGORY_ICONS[f.key] ? `${CATEGORY_ICONS[f.key]} ` : ''}{f.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-400 mb-3">{sorted.length} offers found</p>

        {/* Listings */}
        {sorted.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📋</span>
            </div>
            <p className="text-gray-700 font-semibold">No offers in this category</p>
            <p className="text-gray-400 text-sm mt-1">Try a different filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((job) => (
              <div key={job.id} className="card-elevated p-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">{CATEGORY_ICONS[job.category] || '📋'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm text-gray-900 leading-tight">{job.title}</h3>
                      {job.urgent && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 flex-shrink-0">
                          <Flame size={10} /> Urgente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{job.description}</p>

                    <div className="flex items-center gap-3 mt-2.5">
                      <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                        <MapPin size={10} /> {job.location}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={10} /> {getTimeAgo(job.postedAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm font-bold text-accent-600">
                        {job.budget} EUR{job.budgetType === 'hourly' ? '/h' : ''}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        by {job.postedBy}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
