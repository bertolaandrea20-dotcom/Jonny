'use client';

import { clsx } from 'clsx';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
};

const gradients = [
  'from-primary-400 to-orange-400',
  'from-amber-400 to-yellow-400',
  'from-rose-400 to-pink-400',
  'from-violet-400 to-purple-400',
  'from-emerald-400 to-teal-400',
  'from-sky-400 to-cyan-400',
];

export function Avatar({ src, name, size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colorIndex = name.charCodeAt(0) % gradients.length;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={clsx('rounded-2xl object-cover', sizeClasses[size])}
      />
    );
  }

  return (
    <div
      className={clsx(
        'rounded-2xl flex items-center justify-center text-white font-semibold bg-gradient-to-br shadow-sm',
        sizeClasses[size],
        gradients[colorIndex],
      )}
    >
      {initials}
    </div>
  );
}
