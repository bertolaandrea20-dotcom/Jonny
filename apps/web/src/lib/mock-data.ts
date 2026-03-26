// Mock data for static demo - no backend needed

export const MOCK_SERVICES = [
  { id: 'math-tutoring', name: 'Math Tutoring', category: 'TUTORING', description: 'Private math lessons for all levels', icon: '📐' },
  { id: 'english-tutoring', name: 'English Tutoring', category: 'TUTORING', description: 'English language and literature tutoring', icon: '📚' },
  { id: 'science-tutoring', name: 'Science Tutoring', category: 'TUTORING', description: 'Physics, chemistry, and biology tutoring', icon: '🔬' },
  { id: 'home-cleaning', name: 'Home Cleaning', category: 'CLEANING', description: 'Regular house cleaning service', icon: '🧹' },
  { id: 'deep-cleaning', name: 'Deep Cleaning', category: 'CLEANING', description: 'Thorough deep cleaning for homes', icon: '✨' },
  { id: 'office-cleaning', name: 'Office Cleaning', category: 'CLEANING', description: 'Professional office cleaning', icon: '🏢' },
  { id: 'haircut', name: 'Haircut', category: 'PERSONAL_CARE', description: 'Professional haircut at home', icon: '💇' },
  { id: 'massage', name: 'Massage', category: 'PERSONAL_CARE', description: 'Relaxation and therapeutic massage', icon: '💆' },
  { id: 'manicure-&-pedicure', name: 'Manicure & Pedicure', category: 'PERSONAL_CARE', description: 'Nail care services at home', icon: '💅' },
  { id: 'babysitting', name: 'Babysitting', category: 'BABYSITTING', description: 'Childcare for infants and toddlers', icon: '👶' },
  { id: 'after-school-care', name: 'After-School Care', category: 'BABYSITTING', description: 'After-school childcare and homework help', icon: '🎒' },
  { id: 'dog-walking', name: 'Dog Walking', category: 'PET_SITTING', description: 'Daily dog walking service', icon: '🐕' },
  { id: 'pet-sitting', name: 'Pet Sitting', category: 'PET_SITTING', description: 'In-home pet care while you are away', icon: '🐾' },
  { id: 'cat-sitting', name: 'Cat Sitting', category: 'PET_SITTING', description: 'Cat feeding and care visits', icon: '🐱' },
];

export const MOCK_USERS: Record<string, any> = {
  'client@test.com': {
    id: 'user-client-1',
    email: 'client@test.com',
    firstName: 'Alex',
    lastName: 'Demo',
    role: 'CLIENT',
    phone: '+33 6 12 34 56 78',
    avatarUrl: undefined,
    latitude: 48.8566,
    longitude: 2.3522,
  },
  'marie@test.com': {
    id: 'user-marie-1',
    email: 'marie@test.com',
    firstName: 'Marie',
    lastName: 'Dupont',
    role: 'PROFESSIONAL',
    phone: '+33 6 98 76 54 32',
    avatarUrl: undefined,
    latitude: 48.8606,
    longitude: 2.3376,
    professionalProfile: { id: 'pro-marie' },
  },
  'lucas@test.com': {
    id: 'user-lucas-1',
    email: 'lucas@test.com',
    firstName: 'Lucas',
    lastName: 'Martin',
    role: 'PROFESSIONAL',
    phone: '+33 6 55 44 33 22',
    avatarUrl: undefined,
    latitude: 48.8530,
    longitude: 2.3499,
    professionalProfile: { id: 'pro-lucas' },
  },
  'sophie@test.com': {
    id: 'user-sophie-1',
    email: 'sophie@test.com',
    firstName: 'Sophie',
    lastName: 'Bernard',
    role: 'PROFESSIONAL',
    phone: '+33 6 77 88 99 00',
    avatarUrl: undefined,
    latitude: 48.8650,
    longitude: 2.3800,
    professionalProfile: { id: 'pro-sophie' },
  },
};

const svc = (id: string) => MOCK_SERVICES.find((s) => s.id === id)!;

export const MOCK_PROFILES: Record<string, any> = {
  'pro-marie': {
    id: 'pro-marie',
    userId: 'user-marie-1',
    user: MOCK_USERS['marie@test.com'],
    bio: 'Professional cleaner with 5 years of experience. I love making homes sparkle! Also certified hairdresser.',
    age: 32,
    serviceRadius: 15,
    hourlyRate: 35,
    isVerified: true,
    stripeAccountId: 'demo_account',
    averageRating: 4.8,
    services: [
      { id: 'ps-1', service: svc('home-cleaning'), customRate: null },
      { id: 'ps-2', service: svc('deep-cleaning'), customRate: 45 },
      { id: 'ps-3', service: svc('haircut'), customRate: 30 },
    ],
    availability: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
    ],
    reviewsReceived: [
      {
        id: 'rev-1',
        rating: 5,
        comment: 'Marie did an amazing job! My apartment has never been this clean.',
        reviewer: { firstName: 'Alex', lastName: 'Demo', avatarUrl: undefined },
      },
      {
        id: 'rev-2',
        rating: 5,
        comment: 'Excellent service, very professional and punctual.',
        reviewer: { firstName: 'Claire', lastName: 'Moreau', avatarUrl: undefined },
      },
      {
        id: 'rev-3',
        rating: 4,
        comment: 'Great haircut! Will book again.',
        reviewer: { firstName: 'Pierre', lastName: 'Leroy', avatarUrl: undefined },
      },
    ],
  },
  'pro-lucas': {
    id: 'pro-lucas',
    userId: 'user-lucas-1',
    user: MOCK_USERS['lucas@test.com'],
    bio: 'Mathematics teacher with a passion for making complex concepts simple. 4 years tutoring experience.',
    age: 28,
    serviceRadius: 20,
    hourlyRate: 45,
    isVerified: true,
    stripeAccountId: null,
    averageRating: 4.9,
    services: [
      { id: 'ps-4', service: svc('math-tutoring'), customRate: null },
      { id: 'ps-5', service: svc('science-tutoring'), customRate: 50 },
    ],
    availability: [
      { dayOfWeek: 1, startTime: '10:00', endTime: '20:00' },
      { dayOfWeek: 2, startTime: '10:00', endTime: '20:00' },
      { dayOfWeek: 3, startTime: '10:00', endTime: '20:00' },
      { dayOfWeek: 4, startTime: '10:00', endTime: '20:00' },
      { dayOfWeek: 5, startTime: '10:00', endTime: '20:00' },
      { dayOfWeek: 6, startTime: '10:00', endTime: '16:00' },
    ],
    reviewsReceived: [
      {
        id: 'rev-4',
        rating: 5,
        comment: 'My son went from failing math to getting A grades. Lucas is incredible!',
        reviewer: { firstName: 'Isabelle', lastName: 'Petit', avatarUrl: undefined },
      },
      {
        id: 'rev-5',
        rating: 5,
        comment: 'Very patient and explains things clearly. Highly recommend!',
        reviewer: { firstName: 'Thomas', lastName: 'Garcia', avatarUrl: undefined },
      },
    ],
  },
  'pro-sophie': {
    id: 'pro-sophie',
    userId: 'user-sophie-1',
    user: MOCK_USERS['sophie@test.com'],
    bio: 'Certified childcare professional. I adore kids and animals! Available 7 days a week.',
    age: 25,
    serviceRadius: 10,
    hourlyRate: 25,
    isVerified: true,
    stripeAccountId: 'demo_account',
    averageRating: 4.7,
    services: [
      { id: 'ps-6', service: svc('babysitting'), customRate: null },
      { id: 'ps-7', service: svc('after-school-care'), customRate: 20 },
      { id: 'ps-8', service: svc('dog-walking'), customRate: 15 },
      { id: 'ps-9', service: svc('pet-sitting'), customRate: null },
    ],
    availability: [
      { dayOfWeek: 0, startTime: '08:00', endTime: '22:00' },
      { dayOfWeek: 1, startTime: '08:00', endTime: '22:00' },
      { dayOfWeek: 2, startTime: '08:00', endTime: '22:00' },
      { dayOfWeek: 3, startTime: '08:00', endTime: '22:00' },
      { dayOfWeek: 4, startTime: '08:00', endTime: '22:00' },
      { dayOfWeek: 5, startTime: '08:00', endTime: '22:00' },
      { dayOfWeek: 6, startTime: '08:00', endTime: '22:00' },
    ],
    reviewsReceived: [
      {
        id: 'rev-6',
        rating: 5,
        comment: 'Sophie is wonderful with children. My kids love her!',
        reviewer: { firstName: 'Julie', lastName: 'Roux', avatarUrl: undefined },
      },
      {
        id: 'rev-7',
        rating: 4,
        comment: 'Great dog walker, very reliable.',
        reviewer: { firstName: 'Marc', lastName: 'Blanc', avatarUrl: undefined },
      },
    ],
  },
};

// Which professional offers which services (for search matching)
const PRO_SERVICE_MAP: Record<string, string[]> = {
  'pro-marie': ['home-cleaning', 'deep-cleaning', 'haircut'],
  'pro-lucas': ['math-tutoring', 'science-tutoring'],
  'pro-sophie': ['babysitting', 'after-school-care', 'dog-walking', 'pet-sitting'],
};

export function getSearchResults(serviceId: string): any[] {
  const results: any[] = [];
  for (const [proId, serviceIds] of Object.entries(PRO_SERVICE_MAP)) {
    if (serviceIds.includes(serviceId)) {
      const profile = MOCK_PROFILES[proId];
      results.push({
        profileId: proId,
        firstName: profile.user.firstName,
        lastName: profile.user.lastName,
        avatarUrl: profile.user.avatarUrl,
        bio: profile.bio,
        age: profile.age,
        hourlyRate: profile.hourlyRate,
        distance: proId === 'pro-marie' ? 1.2 : proId === 'pro-lucas' ? 0.8 : 2.5,
        averageRating: profile.averageRating,
        reviewCount: profile.reviewsReceived.length,
      });
    }
  }
  return results;
}

const now = new Date();
const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

export const MOCK_CLIENT_BOOKINGS: any[] = [
  {
    id: 'booking-1',
    clientId: 'user-client-1',
    professionalId: 'pro-marie',
    serviceId: 'home-cleaning',
    status: 'COMPLETED',
    scheduledAt: weekAgo.toISOString(),
    duration: 120,
    totalPrice: 70.00,
    notes: 'Deep clean kitchen and bathroom',
    service: { name: 'Home Cleaning' },
    professional: { user: { firstName: 'Marie', lastName: 'Dupont', avatarUrl: undefined } },
    payment: { status: 'RELEASED', amount: 70.00 },
  },
  {
    id: 'booking-2',
    clientId: 'user-client-1',
    professionalId: 'pro-lucas',
    serviceId: 'math-tutoring',
    status: 'IN_PROGRESS',
    scheduledAt: twoDaysAgo.toISOString(),
    duration: 60,
    totalPrice: 45.00,
    notes: 'Algebra review for upcoming exam',
    service: { name: 'Math Tutoring' },
    professional: { user: { firstName: 'Lucas', lastName: 'Martin', avatarUrl: undefined } },
    payment: { status: 'HELD', amount: 45.00 },
  },
  {
    id: 'booking-3',
    clientId: 'user-client-1',
    professionalId: 'pro-sophie',
    serviceId: 'babysitting',
    status: 'ACCEPTED',
    scheduledAt: inTwoDays.toISOString(),
    duration: 180,
    totalPrice: 75.00,
    notes: 'Two kids, ages 4 and 7',
    service: { name: 'Babysitting' },
    professional: { user: { firstName: 'Sophie', lastName: 'Bernard', avatarUrl: undefined } },
    payment: null,
  },
];

export const MOCK_PRO_BOOKINGS: any[] = [
  {
    id: 'booking-p1',
    clientId: 'user-client-1',
    professionalId: 'pro-marie',
    serviceId: 'home-cleaning',
    status: 'COMPLETED',
    scheduledAt: weekAgo.toISOString(),
    duration: 120,
    totalPrice: 70.00,
    service: { name: 'Home Cleaning' },
    client: { firstName: 'Alex', lastName: 'Demo', avatarUrl: undefined },
    payment: { status: 'RELEASED', amount: 70.00 },
  },
  {
    id: 'booking-p2',
    clientId: 'user-client-1',
    professionalId: 'pro-marie',
    serviceId: 'deep-cleaning',
    status: 'PENDING',
    scheduledAt: inTwoDays.toISOString(),
    duration: 180,
    totalPrice: 135.00,
    notes: 'Full apartment deep clean',
    service: { name: 'Deep Cleaning' },
    client: { firstName: 'Claire', lastName: 'Moreau', avatarUrl: undefined },
    payment: null,
  },
  {
    id: 'booking-p3',
    clientId: 'user-client-1',
    professionalId: 'pro-marie',
    serviceId: 'haircut',
    status: 'ACCEPTED',
    scheduledAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 60,
    totalPrice: 30.00,
    service: { name: 'Haircut' },
    client: { firstName: 'Pierre', lastName: 'Leroy', avatarUrl: undefined },
    payment: { status: 'HELD', amount: 30.00 },
  },
];

export const MOCK_EARNINGS = {
  totalEarned: 595.00,
  pendingEarnings: 30.00,
  platformFeeRate: '15%',
  recentTransactions: [
    {
      bookingId: 'booking-p1',
      service: 'Home Cleaning',
      date: weekAgo.toISOString(),
      amount: 70.00,
      fee: 10.50,
      netAmount: 59.50,
      status: 'RELEASED',
    },
    {
      bookingId: 'booking-p3',
      service: 'Haircut',
      date: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 30.00,
      fee: 4.50,
      netAmount: 25.50,
      status: 'HELD',
    },
    {
      bookingId: 'tx-old-1',
      service: 'Deep Cleaning',
      date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 135.00,
      fee: 20.25,
      netAmount: 114.75,
      status: 'RELEASED',
    },
    {
      bookingId: 'tx-old-2',
      service: 'Home Cleaning',
      date: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 70.00,
      fee: 10.50,
      netAmount: 59.50,
      status: 'RELEASED',
    },
  ],
};
