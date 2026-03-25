const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('jonny_token', token);
    } else {
      localStorage.removeItem('jonny_token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('jonny_token');
    }
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // Auth
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'CLIENT' | 'PROFESSIONAL';
  }) {
    return this.request<{ accessToken: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ accessToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  // Users
  async updateProfile(data: any) {
    return this.request<any>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateLocation(latitude: number, longitude: number) {
    return this.request<any>('/users/me/location', {
      method: 'PATCH',
      body: JSON.stringify({ latitude, longitude }),
    });
  }

  // Services
  async getServices(category?: string) {
    const query = category ? `?category=${category}` : '';
    return this.request<any[]>(`/services${query}`);
  }

  // Matching
  async searchProfessionals(params: {
    serviceId: string;
    latitude: number;
    longitude: number;
    maxDistance?: number;
    dayOfWeek?: number;
    preferredTime?: string;
  }) {
    const query = new URLSearchParams();
    query.set('serviceId', params.serviceId);
    query.set('latitude', String(params.latitude));
    query.set('longitude', String(params.longitude));
    if (params.maxDistance) query.set('maxDistance', String(params.maxDistance));
    if (params.dayOfWeek !== undefined) query.set('dayOfWeek', String(params.dayOfWeek));
    if (params.preferredTime) query.set('preferredTime', params.preferredTime);

    return this.request<any[]>(`/matching/search?${query.toString()}`);
  }

  // Professionals
  async getPublicProfile(id: string) {
    return this.request<any>(`/professionals/${id}/public`);
  }

  async getMyProfessionalProfile() {
    return this.request<any>('/professionals/me');
  }

  async updateProfessionalProfile(data: any) {
    return this.request<any>('/professionals/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async setAvailability(slots: { dayOfWeek: number; startTime: string; endTime: string }[]) {
    return this.request<any>('/professionals/me/availability', {
      method: 'POST',
      body: JSON.stringify({ slots }),
    });
  }

  async addService(serviceId: string, customRate?: number) {
    return this.request<any>(`/professionals/me/services/${serviceId}`, {
      method: 'POST',
      body: JSON.stringify({ customRate }),
    });
  }

  async removeService(serviceId: string) {
    return this.request<any>(`/professionals/me/services/${serviceId}`, {
      method: 'DELETE',
    });
  }

  // Bookings
  async createBooking(data: {
    professionalId: string;
    serviceId: string;
    scheduledAt: string;
    duration?: number;
    notes?: string;
    address?: string;
  }) {
    return this.request<any>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getClientBookings() {
    return this.request<any[]>('/bookings/client');
  }

  async getProfessionalBookings() {
    return this.request<any[]>('/bookings/professional');
  }

  async updateBookingStatus(bookingId: string, status: string) {
    return this.request<any>(`/bookings/${bookingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
}

export const api = new ApiClient();
