// Shared filter types and helpers used by /swipe and /map

export interface Filters {
  category: string;
  selectedService: string;
  selectedDays: number[];
  timeFrom: string;
  timeTo: string;
  priceMin: number;
  priceMax: number;
  maxDistance: number;
  minRating: number;
  selectedLanguage: string;
  verifiedOnly: boolean;
  immediatelyAvailable: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  category: '',
  selectedService: '',
  selectedDays: [],
  timeFrom: '',
  timeTo: '',
  priceMin: 0,
  priceMax: 999,
  maxDistance: 0,
  minRating: 0,
  selectedLanguage: '',
  verifiedOnly: false,
  immediatelyAvailable: false,
};

export const DAY_BUTTONS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Gio' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sab' },
];

export const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00',
];

export const PRICE_OPTIONS = [
  { label: 'Qualsiasi', min: 0, max: 999 },
  { label: '€0-15', min: 0, max: 15 },
  { label: '€15-25', min: 15, max: 25 },
  { label: '€25-40', min: 25, max: 40 },
  { label: '€40+', min: 40, max: 999 },
];

export const DISTANCE_OPTIONS = [
  { label: 'Qualsiasi', value: 0 },
  { label: '< 1 km', value: 1 },
  { label: '< 2 km', value: 2 },
  { label: '< 5 km', value: 5 },
  { label: '< 10 km', value: 10 },
];

export const RATING_OPTIONS = [
  { label: 'Qualsiasi', value: 0 },
  { label: '4.5+', value: 4.5 },
  { label: '4.7+', value: 4.7 },
  { label: '4.9+', value: 4.9 },
];

export const LANGUAGE_OPTIONS = [
  { label: 'Qualsiasi', value: '', flag: '🌍' },
  { label: 'Italiano', value: 'Italiano', flag: '🇮🇹' },
  { label: 'Francese', value: 'Francese', flag: '🇫🇷' },
  { label: 'Inglese', value: 'Inglese', flag: '🇬🇧' },
  { label: 'Spagnolo', value: 'Spagnolo', flag: '🇪🇸' },
  { label: 'Tedesco', value: 'Tedesco', flag: '🇩🇪' },
];

function isAvailableOnDays(pro: any, days: number[]): boolean {
  if (!pro.availability || days.length === 0) return true;
  return days.some((day) => pro.availability.some((a: any) => a.day === day));
}

function isAvailableInTimeRange(pro: any, days: number[], timeFrom: string, timeTo: string): boolean {
  if (!pro.availability) return true;
  if (!timeFrom && !timeTo) return true;
  const from = timeFrom || '00:00';
  const to = timeTo || '23:59';
  const checkDays = days.length > 0 ? days : [0, 1, 2, 3, 4, 5, 6];
  return checkDays.some((day) =>
    pro.availability.some((a: any) => a.day === day && a.start <= to && a.end >= from)
  );
}

function hasService(pro: any, serviceName: string): boolean {
  if (!serviceName) return true;
  return pro.services.some((s: string) => s.toLowerCase().includes(serviceName.toLowerCase()));
}

export function applyAllFilters(pros: any[], f: Filters): any[] {
  let result = [...pros];
  if (f.category) result = result.filter((p) => p.category === f.category);
  if (f.selectedService) result = result.filter((p) => hasService(p, f.selectedService));
  if (f.selectedDays.length > 0) result = result.filter((p) => isAvailableOnDays(p, f.selectedDays));
  if (f.timeFrom || f.timeTo) result = result.filter((p) => isAvailableInTimeRange(p, f.selectedDays, f.timeFrom, f.timeTo));
  if (f.priceMin > 0 || f.priceMax < 999) result = result.filter((p) => p.hourlyRate >= f.priceMin && p.hourlyRate <= f.priceMax);
  if (f.maxDistance > 0) result = result.filter((p) => p.distance <= f.maxDistance);
  if (f.minRating > 0) result = result.filter((p) => p.averageRating >= f.minRating);
  if (f.selectedLanguage) result = result.filter((p) => p.languages?.includes(f.selectedLanguage));
  if (f.verifiedOnly) result = result.filter((p) => p.verified);
  if (f.immediatelyAvailable) result = result.filter((p) => p.immediatelyAvailable);
  return result;
}

export function isFilterActive(f: Filters): boolean {
  return JSON.stringify(f) !== JSON.stringify(DEFAULT_FILTERS);
}

export function countActiveFilters(f: Filters): number {
  let n = 0;
  if (f.category) n++;
  if (f.selectedService) n++;
  if (f.selectedDays.length > 0) n++;
  if (f.timeFrom || f.timeTo) n++;
  if (f.priceMin > 0 || f.priceMax < 999) n++;
  if (f.maxDistance > 0) n++;
  if (f.minRating > 0) n++;
  if (f.selectedLanguage) n++;
  if (f.verifiedOnly) n++;
  if (f.immediatelyAvailable) n++;
  return n;
}
