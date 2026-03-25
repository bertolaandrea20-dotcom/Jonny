export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const SERVICE_CATEGORIES = [
  { key: 'TUTORING', label: 'Private Tutoring', icon: '📚' },
  { key: 'CLEANING', label: 'Cleaning Services', icon: '🧹' },
  { key: 'PERSONAL_CARE', label: 'Personal Care', icon: '💆' },
  { key: 'BABYSITTING', label: 'Babysitting', icon: '👶' },
  { key: 'PET_SITTING', label: 'Pet Sitting', icon: '🐾' },
] as const;

export const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
] as const;

export const MAX_SERVICE_RADIUS_KM = 100;
export const DEFAULT_SERVICE_RADIUS_KM = 10;
export const MAX_SEARCH_DISTANCE_KM = 50;
export const DEFAULT_SEARCH_DISTANCE_KM = 20;
