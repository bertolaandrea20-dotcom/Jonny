'use client';

import { MapPin, Shield, Zap, Globe } from 'lucide-react';
import { Avatar } from './avatar';
import { StarRating } from './star-rating';
import { formatDistance } from '@/lib/geolocation';

interface ProfessionalCardProps {
  professional: {
    profileId: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    bio: string | null;
    age: number | null;
    hourlyRate: number | null;
    distance: number;
    averageRating: number | null;
    reviewCount: number;
    verified?: boolean;
    languages?: string[];
    immediatelyAvailable?: boolean;
  };
  onClick?: () => void;
}

export function ProfessionalCard({ professional: p, onClick }: ProfessionalCardProps) {
  return (
    <button
      onClick={onClick}
      className="card-elevated w-full p-4 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
    >
      <div className="flex gap-4">
        <div className="relative flex-shrink-0">
          <Avatar
            src={p.avatarUrl}
            name={`${p.firstName} ${p.lastName}`}
            size="lg"
          />
          {p.verified && (
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Shield size={10} className="text-emerald-500" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {p.firstName} {p.lastName}
                </h3>
                {p.immediatelyAvailable && (
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                    <Zap size={8} /> Ora
                  </span>
                )}
              </div>
              {p.age && <span className="text-xs text-gray-400">{p.age} anni</span>}
            </div>
            {p.hourlyRate && (
              <span className="text-sm font-bold text-accent-600 bg-accent-50 px-2.5 py-1 rounded-xl">
                €{p.hourlyRate.toFixed(0)}/h
              </span>
            )}
          </div>

          <StarRating rating={p.averageRating} count={p.reviewCount} />

          {p.bio && (
            <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{p.bio}</p>
          )}

          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 flex-wrap">
            <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-full">
              <MapPin size={11} />
              {formatDistance(p.distance)}
            </span>
            {p.languages && p.languages.length > 0 && (
              <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-full">
                <Globe size={10} />
                {p.languages.slice(0, 2).join(', ')}{p.languages.length > 2 ? ` +${p.languages.length - 2}` : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
