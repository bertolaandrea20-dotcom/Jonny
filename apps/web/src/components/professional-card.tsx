'use client';

import { MapPin } from 'lucide-react';
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
        <Avatar
          src={p.avatarUrl}
          name={`${p.firstName} ${p.lastName}`}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                {p.firstName} {p.lastName}
              </h3>
              {p.age && <span className="text-xs text-gray-400">{p.age} years old</span>}
            </div>
            {p.hourlyRate && (
              <span className="text-sm font-bold text-accent-600 bg-accent-50 px-2.5 py-1 rounded-xl">
                {p.hourlyRate.toFixed(0)}/h
              </span>
            )}
          </div>

          <StarRating rating={p.averageRating} count={p.reviewCount} />

          {p.bio && (
            <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{p.bio}</p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-full">
              <MapPin size={11} />
              {formatDistance(p.distance)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
