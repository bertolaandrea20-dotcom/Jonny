'use client';

import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { MapPin, X, Heart } from 'lucide-react';
import { Avatar } from './avatar';
import { StarRating } from './star-rating';
import { formatDistance } from '@/lib/geolocation';

interface SwipeCardProps {
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
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap: () => void;
}

export function SwipeCard({ professional: p, onSwipeLeft, onSwipeRight, onTap }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      onSwipeRight();
    } else if (info.offset.x < -100) {
      onSwipeLeft();
    }
  };

  return (
    <motion.div
      className="absolute inset-0 swipe-card"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
    >
      <div
        className="card h-full flex flex-col relative overflow-hidden"
        onClick={onTap}
      >
        {/* Like / Nope overlays */}
        <motion.div
          className="absolute top-6 right-6 z-10 bg-green-500 text-white font-bold text-xl px-4 py-2 rounded-xl border-2 border-green-600 rotate-[-15deg]"
          style={{ opacity: likeOpacity }}
        >
          LIKE
        </motion.div>
        <motion.div
          className="absolute top-6 left-6 z-10 bg-red-500 text-white font-bold text-xl px-4 py-2 rounded-xl border-2 border-red-600 rotate-[15deg]"
          style={{ opacity: nopeOpacity }}
        >
          NOPE
        </motion.div>

        {/* Avatar section */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-primary-50 to-white pt-8">
          <Avatar
            src={p.avatarUrl}
            name={`${p.firstName} ${p.lastName}`}
            size="xl"
          />
        </div>

        {/* Info section */}
        <div className="p-5">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-xl font-bold">
                {p.firstName} {p.lastName}
                {p.age && <span className="text-gray-400 font-normal text-base ml-2">{p.age}</span>}
              </h2>
              <div className="flex items-center gap-1 text-sm text-gray-400">
                <MapPin size={14} />
                {formatDistance(p.distance)} away
              </div>
            </div>
            {p.hourlyRate && (
              <span className="text-lg font-bold text-primary-600">
                {p.hourlyRate.toFixed(0)}/h
              </span>
            )}
          </div>

          <StarRating rating={p.averageRating} count={p.reviewCount} />

          {p.bio && (
            <p className="text-sm text-gray-600 mt-3 line-clamp-3">{p.bio}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-6 pb-6">
          <button
            onClick={(e) => { e.stopPropagation(); onSwipeLeft(); }}
            className="w-14 h-14 rounded-full border-2 border-red-200 flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors"
          >
            <X size={28} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSwipeRight(); }}
            className="w-14 h-14 rounded-full border-2 border-green-200 flex items-center justify-center text-green-500 hover:bg-green-50 transition-colors"
          >
            <Heart size={28} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
