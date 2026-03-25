// ─── User Types ───────────────────────────────────

export enum UserRole {
  CLIENT = 'CLIENT',
  PROFESSIONAL = 'PROFESSIONAL',
  ADMIN = 'ADMIN',
}

export enum ServiceCategory {
  TUTORING = 'TUTORING',
  CLEANING = 'CLEANING',
  PERSONAL_CARE = 'PERSONAL_CARE',
  BABYSITTING = 'BABYSITTING',
  PET_SITTING = 'PET_SITTING',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  HELD = 'HELD',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
}

// ─── API Response Types ───────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface ProfessionalCard {
  profileId: string;
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string | null;
  age: number | null;
  hourlyRate: number | null;
  distance: number;
  averageRating: number | null;
  reviewCount: number;
  score: number;
}

export interface AuthResponse {
  accessToken: string;
  user: UserProfile;
}

export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}
