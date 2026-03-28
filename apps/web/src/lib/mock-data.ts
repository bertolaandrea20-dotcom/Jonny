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

// Extra professionals for the swipe discovery feed
export const MOCK_SWIPE_PROFESSIONALS: any[] = [
  { profileId: 'pro-marie', firstName: 'Marie', lastName: 'Dupont', avatarUrl: null, bio: 'Professional cleaner with 5 years of experience. I love making homes sparkle!', age: 32, hourlyRate: 35, distance: 1.2, averageRating: 4.8, reviewCount: 3, category: 'CLEANING', services: ['Home Cleaning', 'Deep Cleaning', 'Haircut'], verified: true, availability: [{ day: 1, start: '09:00', end: '17:00' }, { day: 2, start: '09:00', end: '17:00' }, { day: 3, start: '09:00', end: '17:00' }, { day: 4, start: '09:00', end: '17:00' }, { day: 5, start: '09:00', end: '17:00' }] },
  { profileId: 'pro-lucas', firstName: 'Lucas', lastName: 'Martin', avatarUrl: null, bio: 'Mathematics teacher with a passion for making complex concepts simple.', age: 28, hourlyRate: 45, distance: 0.8, averageRating: 4.9, reviewCount: 2, category: 'TUTORING', services: ['Math Tutoring', 'Science Tutoring'], verified: true, availability: [{ day: 1, start: '10:00', end: '20:00' }, { day: 2, start: '10:00', end: '20:00' }, { day: 3, start: '10:00', end: '20:00' }, { day: 4, start: '10:00', end: '20:00' }, { day: 5, start: '10:00', end: '20:00' }, { day: 6, start: '10:00', end: '16:00' }] },
  { profileId: 'pro-sophie', firstName: 'Sophie', lastName: 'Bernard', avatarUrl: null, bio: 'Certified childcare professional. I adore kids and animals!', age: 25, hourlyRate: 25, distance: 2.5, averageRating: 4.7, reviewCount: 2, category: 'BABYSITTING', services: ['Babysitting', 'After-School Care', 'Dog Walking', 'Pet Sitting'], verified: true, availability: [{ day: 0, start: '08:00', end: '22:00' }, { day: 1, start: '08:00', end: '22:00' }, { day: 2, start: '08:00', end: '22:00' }, { day: 3, start: '08:00', end: '22:00' }, { day: 4, start: '08:00', end: '22:00' }, { day: 5, start: '08:00', end: '22:00' }, { day: 6, start: '08:00', end: '22:00' }] },
  { profileId: 'pro-elena', firstName: 'Elena', lastName: 'Rossi', avatarUrl: null, bio: 'Estetista certificata, specializzata in trattamenti viso e corpo a domicilio.', age: 29, hourlyRate: 40, distance: 1.8, averageRating: 4.9, reviewCount: 7, category: 'PERSONAL_CARE', services: ['Manicure & Pedicure', 'Massage'], verified: true, availability: [{ day: 1, start: '09:00', end: '19:00' }, { day: 2, start: '09:00', end: '19:00' }, { day: 3, start: '09:00', end: '19:00' }, { day: 4, start: '09:00', end: '19:00' }, { day: 5, start: '09:00', end: '19:00' }, { day: 6, start: '09:00', end: '14:00' }] },
  { profileId: 'pro-marco', firstName: 'Marco', lastName: 'Bianchi', avatarUrl: null, bio: 'Laureato in ingegneria, offro ripetizioni di matematica e fisica per superiori e università.', age: 31, hourlyRate: 30, distance: 3.1, averageRating: 4.6, reviewCount: 4, category: 'TUTORING', services: ['Math Tutoring', 'Science Tutoring'], verified: false, availability: [{ day: 1, start: '15:00', end: '21:00' }, { day: 2, start: '15:00', end: '21:00' }, { day: 3, start: '15:00', end: '21:00' }, { day: 5, start: '15:00', end: '21:00' }, { day: 6, start: '09:00', end: '18:00' }, { day: 0, start: '09:00', end: '18:00' }] },
  { profileId: 'pro-giulia', firstName: 'Giulia', lastName: 'Conti', avatarUrl: null, bio: 'Amante degli animali, mi prendo cura dei vostri amici a 4 zampe con tanto amore.', age: 23, hourlyRate: 15, distance: 0.5, averageRating: 5.0, reviewCount: 3, category: 'PET_SITTING', services: ['Dog Walking', 'Pet Sitting', 'Cat Sitting'], verified: true, availability: [{ day: 0, start: '07:00', end: '20:00' }, { day: 1, start: '07:00', end: '20:00' }, { day: 2, start: '07:00', end: '20:00' }, { day: 3, start: '07:00', end: '20:00' }, { day: 4, start: '07:00', end: '20:00' }, { day: 5, start: '07:00', end: '20:00' }, { day: 6, start: '07:00', end: '20:00' }] },
  { profileId: 'pro-andrea', firstName: 'Andrea', lastName: 'Moretti', avatarUrl: null, bio: 'Impresa di pulizie professionale. Puliamo case, uffici e post-ristrutturazione.', age: 38, hourlyRate: 22, distance: 4.2, averageRating: 4.5, reviewCount: 8, category: 'CLEANING', services: ['Home Cleaning', 'Deep Cleaning', 'Office Cleaning'], verified: true, availability: [{ day: 1, start: '06:00', end: '18:00' }, { day: 2, start: '06:00', end: '18:00' }, { day: 3, start: '06:00', end: '18:00' }, { day: 4, start: '06:00', end: '18:00' }, { day: 5, start: '06:00', end: '18:00' }] },
  { profileId: 'pro-chiara', firstName: 'Chiara', lastName: 'Ferrari', avatarUrl: null, bio: 'Babysitter con esperienza pluriennale, parlo inglese e francese. Amo giocare e insegnare.', age: 26, hourlyRate: 18, distance: 1.6, averageRating: 4.8, reviewCount: 5, category: 'BABYSITTING', services: ['Babysitting', 'After-School Care'], verified: true, availability: [{ day: 1, start: '14:00', end: '22:00' }, { day: 2, start: '14:00', end: '22:00' }, { day: 3, start: '14:00', end: '22:00' }, { day: 4, start: '14:00', end: '22:00' }, { day: 5, start: '14:00', end: '23:00' }, { day: 6, start: '14:00', end: '23:00' }] },
  { profileId: 'pro-davide', firstName: 'Davide', lastName: 'Romano', avatarUrl: null, bio: 'Parrucchiere professionista con 10 anni di esperienza. Taglio uomo, donna e bambino.', age: 35, hourlyRate: 30, distance: 2.0, averageRating: 4.7, reviewCount: 6, category: 'PERSONAL_CARE', services: ['Haircut'], verified: true, availability: [{ day: 2, start: '09:00', end: '19:00' }, { day: 3, start: '09:00', end: '19:00' }, { day: 4, start: '09:00', end: '19:00' }, { day: 5, start: '09:00', end: '19:00' }, { day: 6, start: '09:00', end: '16:00' }] },
  { profileId: 'pro-sara', firstName: 'Sara', lastName: 'Colombo', avatarUrl: null, bio: 'Insegnante di inglese madrelingua britannica. Lezioni dinamiche e personalizzate.', age: 30, hourlyRate: 35, distance: 1.4, averageRating: 4.9, reviewCount: 9, category: 'TUTORING', services: ['English Tutoring'], verified: true, availability: [{ day: 1, start: '09:00', end: '13:00' }, { day: 1, start: '16:00', end: '21:00' }, { day: 2, start: '09:00', end: '13:00' }, { day: 2, start: '16:00', end: '21:00' }, { day: 3, start: '09:00', end: '21:00' }, { day: 4, start: '16:00', end: '21:00' }, { day: 5, start: '09:00', end: '13:00' }] },
  { profileId: 'pro-luca', firstName: 'Luca', lastName: 'Mancini', avatarUrl: null, bio: 'Dog walker appassionato. Percorsi personalizzati per cani di tutte le taglie.', age: 24, hourlyRate: 12, distance: 0.9, averageRating: 4.8, reviewCount: 4, category: 'PET_SITTING', services: ['Dog Walking'], verified: false, availability: [{ day: 0, start: '06:00', end: '12:00' }, { day: 1, start: '06:00', end: '10:00' }, { day: 1, start: '17:00', end: '20:00' }, { day: 2, start: '06:00', end: '10:00' }, { day: 2, start: '17:00', end: '20:00' }, { day: 3, start: '06:00', end: '10:00' }, { day: 3, start: '17:00', end: '20:00' }, { day: 4, start: '06:00', end: '10:00' }, { day: 4, start: '17:00', end: '20:00' }, { day: 5, start: '06:00', end: '10:00' }, { day: 5, start: '17:00', end: '20:00' }, { day: 6, start: '06:00', end: '12:00' }] },
  { profileId: 'pro-alessia', firstName: 'Alessia', lastName: 'Gallo', avatarUrl: null, bio: 'Massaggiatrice olistica certificata. Trattamenti rilassanti e decontratturanti.', age: 33, hourlyRate: 50, distance: 2.8, averageRating: 5.0, reviewCount: 11, category: 'PERSONAL_CARE', services: ['Massage'], verified: true, availability: [{ day: 1, start: '10:00', end: '20:00' }, { day: 2, start: '10:00', end: '20:00' }, { day: 3, start: '10:00', end: '20:00' }, { day: 4, start: '10:00', end: '20:00' }, { day: 5, start: '10:00', end: '20:00' }, { day: 6, start: '10:00', end: '15:00' }] },
];

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

export function getSwipeProfessionals(category?: string): any[] {
  let pros = [...MOCK_SWIPE_PROFESSIONALS];
  if (category) {
    pros = pros.filter((p) => p.category === category);
  }
  // Shuffle for a fresh feel each time
  for (let i = pros.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pros[i], pros[j]] = [pros[j], pros[i]];
  }
  return pros;
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

// ─── Job Listings (Marketplace-style) ───

const CATEGORY_ICONS: Record<string, string> = {
  TUTORING: '📚', CLEANING: '✨', PERSONAL_CARE: '💆', BABYSITTING: '👶', PET_SITTING: '🐾',
};

export const MOCK_JOB_LISTINGS: any[] = [
  { id: 'job-1', title: 'Cercasi babysitter per 2 bambini', description: 'Cerco una babysitter affidabile per due bambini (4 e 7 anni), dal lunedi al venerdi dalle 15 alle 19. Preferibilmente con esperienza e referenze.', category: 'BABYSITTING', location: 'Milano, Zona Navigli', budget: 15, budgetType: 'hourly', postedBy: 'Anna R.', postedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), urgent: true },
  { id: 'job-2', title: 'Pulizia appartamento 80mq', description: 'Appartamento bilocale in zona centro, necessita pulizia profonda settimanale. Inclusi bagno, cucina, pavimenti e polvere.', category: 'CLEANING', location: 'Roma, Trastevere', budget: 60, budgetType: 'fixed', postedBy: 'Marco B.', postedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(), urgent: false },
  { id: 'job-3', title: 'Ripetizioni matematica liceo', description: 'Mio figlio frequenta il terzo anno di liceo scientifico e ha bisogno di supporto in matematica. 2 volte a settimana, disponibili anche online.', category: 'TUTORING', location: 'Torino, San Salvario', budget: 25, budgetType: 'hourly', postedBy: 'Giulia M.', postedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(), urgent: false },
  { id: 'job-4', title: 'Dog sitter per weekend', description: 'Cerco qualcuno che possa tenere il mio Labrador (3 anni, docile) durante i weekend. Incluse passeggiate e pasti.', category: 'PET_SITTING', location: 'Napoli, Vomero', budget: 30, budgetType: 'fixed', postedBy: 'Luca P.', postedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(), urgent: false },
  { id: 'job-5', title: 'Parrucchiere a domicilio', description: 'Cerco parrucchiere/a per taglio e piega a domicilio per signora anziana. Zona facilmente raggiungibile. Una volta al mese.', category: 'PERSONAL_CARE', location: 'Firenze, Campo di Marte', budget: 35, budgetType: 'fixed', postedBy: 'Sara L.', postedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), urgent: false },
  { id: 'job-6', title: 'Pulizia ufficio 120mq', description: 'Ufficio open space con 4 postazioni, bagno e cucina. Pulizia giornaliera dal lunedi al venerdi, orario flessibile (sera o mattina presto).', category: 'CLEANING', location: 'Milano, Porta Nuova', budget: 18, budgetType: 'hourly', postedBy: 'Studio Legale Rossi', postedAt: new Date(now.getTime() - 1.5 * 24 * 60 * 60 * 1000).toISOString(), urgent: true },
  { id: 'job-7', title: 'Lezioni di inglese per adulto', description: 'Livello intermedio (B1), vorrei arrivare a B2 per motivi lavorativi. Disponibile la sera dopo le 19 o nei weekend.', category: 'TUTORING', location: 'Bologna, Centro', budget: 30, budgetType: 'hourly', postedBy: 'Davide C.', postedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), urgent: false },
  { id: 'job-8', title: 'Babysitter serale per neonato', description: 'Cerchiamo una babysitter per il nostro bimbo di 8 mesi, il venerdi e sabato sera dalle 20 alle 24. Esperienza con neonati richiesta.', category: 'BABYSITTING', location: 'Roma, Prati', budget: 12, budgetType: 'hourly', postedBy: 'Chiara & Matteo', postedAt: new Date(now.getTime() - 2.5 * 24 * 60 * 60 * 1000).toISOString(), urgent: true },
  { id: 'job-9', title: 'Massaggio rilassante a domicilio', description: 'Cerco massaggiatore/trice professionista per massaggi rilassanti settimanali. Lettino disponibile a casa.', category: 'PERSONAL_CARE', location: 'Milano, Isola', budget: 50, budgetType: 'fixed', postedBy: 'Elena V.', postedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), urgent: false },
  { id: 'job-10', title: 'Cat sitter per vacanze estive', description: '2 gatti (sterilizzati, indoor). Servono visite giornaliere per cibo, acqua e coccole. Periodo: 15-30 agosto.', category: 'PET_SITTING', location: 'Torino, Crocetta', budget: 15, budgetType: 'fixed', postedBy: 'Federica N.', postedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), urgent: false },
  { id: 'job-11', title: 'Ripetizioni fisica e chimica', description: 'Studentessa universitaria cerca aiuto per preparare esami di Fisica 1 e Chimica Generale. Anche online.', category: 'TUTORING', location: 'Padova, Centro', budget: 20, budgetType: 'hourly', postedBy: 'Valentina S.', postedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), urgent: false },
  { id: 'job-12', title: 'Pulizia post-ristrutturazione', description: 'Appartamento appena ristrutturato, 100mq. Serve pulizia completa (polvere, residui, vetri, pavimenti). Lavoro una tantum.', category: 'CLEANING', location: 'Roma, Testaccio', budget: 150, budgetType: 'fixed', postedBy: 'Giovanni T.', postedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), urgent: true },
  { id: 'job-13', title: 'Manicure e pedicure a domicilio', description: 'Cerco estetista per manicure con semipermanente e pedicure curativo. Ogni 3 settimane circa.', category: 'PERSONAL_CARE', location: 'Napoli, Chiaia', budget: 40, budgetType: 'fixed', postedBy: 'Alessia F.', postedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), urgent: false },
  { id: 'job-14', title: 'Dog walker mattutino', description: 'Cerco persona affidabile per portare a passeggio il mio Border Collie ogni mattina (7-8) in zona parco. 5 giorni a settimana.', category: 'PET_SITTING', location: 'Milano, Lambrate', budget: 10, budgetType: 'fixed', postedBy: 'Simone G.', postedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), urgent: false },
  { id: 'job-15', title: 'Aiuto compiti elementari', description: 'Bambina di 9 anni, terza elementare. Serve aiuto con compiti di italiano e matematica, 3 pomeriggi a settimana.', category: 'TUTORING', location: 'Firenze, Rifredi', budget: 15, budgetType: 'hourly', postedBy: 'Roberta D.', postedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(), urgent: false },
  { id: 'job-16', title: 'Babysitter bilingue (IT/EN)', description: 'Famiglia italo-americana cerca babysitter bilingue per bambino di 5 anni. Conversazione in inglese durante il gioco.', category: 'BABYSITTING', location: 'Roma, EUR', budget: 18, budgetType: 'hourly', postedBy: 'James & Francesca', postedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(), urgent: false },
  { id: 'job-17', title: 'Pulizia B&B tra check-out', description: 'Bed & Breakfast 3 camere, serve pulizia rapida e accurata tra un ospite e il successivo. Orario variabile, spesso 11-14.', category: 'CLEANING', location: 'Venezia, Dorsoduro', budget: 25, budgetType: 'fixed', postedBy: 'B&B Ca\' Bella', postedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), urgent: false },
  { id: 'job-18', title: 'Pet sitter per coniglio nano', description: 'Cerco qualcuno che venga a casa mia a curare il mio coniglietto durante le vacanze di Pasqua (5 giorni). Solo cibo e acqua.', category: 'PET_SITTING', location: 'Bologna, Santo Stefano', budget: 10, budgetType: 'fixed', postedBy: 'Martina Z.', postedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), urgent: false },
];

export function getJobListings(category?: string): any[] {
  let listings = MOCK_JOB_LISTINGS.map((j) => ({ ...j, icon: CATEGORY_ICONS[j.category] || '📋' }));
  if (category) listings = listings.filter((j) => j.category === category);
  return listings.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
}

// ─── Chat / Messaggistica ───

export const MOCK_CONVERSATIONS = [
  {
    id: 'conv-1',
    recipientId: 'pro-marie',
    recipientName: 'Marie Dupont',
    recipientAvatar: null,
    recipientRole: 'Pulizie domestiche',
    lastMessage: 'Perfetto, allora ci vediamo giovedì alle 10!',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    unreadCount: 2,
  },
  {
    id: 'conv-2',
    recipientId: 'pro-lucas',
    recipientName: 'Lucas Martin',
    recipientAvatar: null,
    recipientRole: 'Ripetizioni matematica',
    lastMessage: 'Ho preparato degli esercizi per la prossima lezione',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    unreadCount: 0,
  },
  {
    id: 'conv-3',
    recipientId: 'pro-sophie',
    recipientName: 'Sophie Bernard',
    recipientAvatar: null,
    recipientRole: 'Babysitting',
    lastMessage: 'I bambini si sono divertiti tantissimo oggi! 😊',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    unreadCount: 1,
  },
  {
    id: 'conv-4',
    recipientId: 'pro-giulia',
    recipientName: 'Giulia Conti',
    recipientAvatar: null,
    recipientRole: 'Dog Walking',
    lastMessage: 'Posso iniziare da lunedì prossimo!',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    unreadCount: 0,
  },
];

export const MOCK_MESSAGES: Record<string, { id: string; text: string; sent: boolean; timestamp: string }[]> = {
  'conv-1': [
    { id: 'm1-1', text: 'Buongiorno! Ho visto il suo profilo per il servizio di pulizie.', sent: true, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    { id: 'm1-2', text: 'Buongiorno! Grazie per avermi contattata. Come posso aiutarla?', sent: false, timestamp: new Date(Date.now() - 1.9 * 60 * 60 * 1000).toISOString() },
    { id: 'm1-3', text: 'Avrei bisogno di una pulizia profonda del mio appartamento, circa 80mq. Sarebbe disponibile questa settimana?', sent: true, timestamp: new Date(Date.now() - 1.8 * 60 * 60 * 1000).toISOString() },
    { id: 'm1-4', text: 'Certo! Per 80mq consiglio almeno 3 ore. Potrei venire giovedì mattina alle 10, va bene?', sent: false, timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
    { id: 'm1-5', text: 'Giovedì alle 10 è perfetto! Quanto verrebbe a costare?', sent: true, timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
    { id: 'm1-6', text: 'Per una pulizia profonda il costo è di €45/ora, quindi €135 in totale. Porto io tutti i prodotti!', sent: false, timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
    { id: 'm1-7', text: 'Perfetto, allora ci vediamo giovedì alle 10!', sent: false, timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
  ],
  'conv-2': [
    { id: 'm2-1', text: 'Ciao Lucas! Mio figlio ha un esame di algebra la prossima settimana, potresti aiutarlo?', sent: true, timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'm2-2', text: 'Ciao! Certo, nessun problema. Su quali argomenti deve concentrarsi?', sent: false, timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString() },
    { id: 'm2-3', text: 'Equazioni di secondo grado e disequazioni. Ha un po\' di difficoltà con la parte grafica.', sent: true, timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString() },
    { id: 'm2-4', text: 'Capisco, sono argomenti importanti. Facciamo 2 lezioni da 1.5h?', sent: false, timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString() },
    { id: 'm2-5', text: 'Sì, perfetto. Quando saresti disponibile?', sent: true, timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString() },
    { id: 'm2-6', text: 'Martedì e giovedì pomeriggio alle 16, ti va?', sent: false, timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
    { id: 'm2-7', text: 'Perfetto, confermo!', sent: true, timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() },
    { id: 'm2-8', text: 'Ho preparato degli esercizi per la prossima lezione', sent: false, timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
  ],
  'conv-3': [
    { id: 'm3-1', text: 'Ciao Sophie! Avremmo bisogno di una babysitter per sabato sera, dalle 19 alle 23.', sent: true, timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'm3-2', text: 'Ciao! Sabato sera sono libera, nessun problema! Quanti bambini?', sent: false, timestamp: new Date(Date.now() - 2.8 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'm3-3', text: 'Due, 4 e 7 anni. Il piccolo va a letto alle 20:30.', sent: true, timestamp: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'm3-4', text: 'Perfetto! Porterò dei giochi e delle attività. A sabato! 🎨', sent: false, timestamp: new Date(Date.now() - 2.3 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'm3-5', text: 'Come è andato tutto ieri sera?', sent: true, timestamp: new Date(Date.now() - 1.2 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'm3-6', text: 'I bambini si sono divertiti tantissimo oggi! 😊', sent: false, timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  ],
  'conv-4': [
    { id: 'm4-1', text: 'Ciao Giulia! Cerco qualcuno per portare a passeggio il mio cane al mattino.', sent: true, timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'm4-2', text: 'Ciao! Che tipo di cane è? E a che ora di solito?', sent: false, timestamp: new Date(Date.now() - 3.8 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'm4-3', text: 'Un Golden Retriever di 2 anni, molto socievole. Verso le 7:30-8:00.', sent: true, timestamp: new Date(Date.now() - 3.5 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'm4-4', text: 'Adoro i Golden! L\'orario è perfetto, faccio già il giro del parco ogni mattina.', sent: false, timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'm4-5', text: 'Quando potresti iniziare?', sent: true, timestamp: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'm4-6', text: 'Posso iniziare da lunedì prossimo!', sent: false, timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  ],
};

// ─── Map Coordinates (Milano area) ───

export const MOCK_MAP_PROFESSIONALS = MOCK_SWIPE_PROFESSIONALS.map((p, i) => ({
  ...p,
  lat: [45.4642, 45.4732, 45.4580, 45.4810, 45.4520, 45.4695, 45.4780, 45.4550, 45.4670, 45.4850, 45.4600, 45.4710][i],
  lng: [9.1900, 9.1750, 9.2100, 9.1650, 9.2000, 9.1580, 9.2050, 9.1800, 9.2150, 9.1700, 9.1950, 9.1850][i],
}));

// ─── Pro Statistics ───

export const MOCK_PRO_STATS = {
  totalEarnings: 4850,
  totalBookings: 87,
  avgRating: 4.8,
  totalClients: 34,
  monthlyEarnings: [
    { month: 'Ott', amount: 620 },
    { month: 'Nov', amount: 780 },
    { month: 'Dic', amount: 950 },
    { month: 'Gen', amount: 720 },
    { month: 'Feb', amount: 880 },
    { month: 'Mar', amount: 900 },
  ],
  monthlyBookings: [
    { month: 'Ott', count: 12 },
    { month: 'Nov', count: 15 },
    { month: 'Dic', count: 18 },
    { month: 'Gen', count: 13 },
    { month: 'Feb', count: 16 },
    { month: 'Mar', count: 13 },
  ],
  serviceDistribution: [
    { category: 'Pulizie casa', count: 35, color: '#10b981' },
    { category: 'Pulizia profonda', count: 22, color: '#3b82f6' },
    { category: 'Taglio capelli', count: 18, color: '#f59e0b' },
    { category: 'Pulizia ufficio', count: 12, color: '#8b5cf6' },
  ],
};

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

// ─── Payment Methods (mock) ───

export const MOCK_PAYMENT_METHODS = [
  { id: 'card-1', type: 'visa', last4: '4242', expiry: '12/27', holder: 'Alex Demo', isDefault: true },
  { id: 'card-2', type: 'mastercard', last4: '8888', expiry: '06/28', holder: 'Alex Demo', isDefault: false },
];

export const MOCK_PROMO_CODES: Record<string, { discount: number; type: 'percent' | 'fixed'; label: string }> = {
  'WELCOME10': { discount: 10, type: 'percent', label: '10% di sconto benvenuto' },
  'SCONTO5': { discount: 5, type: 'fixed', label: '€5 di sconto' },
};

// ─── Calendar Bookings (extra mock per popolare il calendario) ───

export const MOCK_CALENDAR_BOOKINGS: any[] = [
  ...MOCK_CLIENT_BOOKINGS,
  {
    id: 'booking-cal-1',
    clientId: 'user-client-1',
    professionalId: 'pro-elena',
    serviceId: 'manicure-&-pedicure',
    status: 'ACCEPTED',
    scheduledAt: new Date(now.getFullYear(), now.getMonth(), 5, 14, 0).toISOString(),
    duration: 90,
    totalPrice: 40.00,
    service: { name: 'Manicure & Pedicure' },
    professional: { user: { firstName: 'Elena', lastName: 'Rossi', avatarUrl: undefined } },
    payment: null,
  },
  {
    id: 'booking-cal-2',
    clientId: 'user-client-1',
    professionalId: 'pro-sara',
    serviceId: 'english-tutoring',
    status: 'COMPLETED',
    scheduledAt: new Date(now.getFullYear(), now.getMonth(), 10, 17, 0).toISOString(),
    duration: 60,
    totalPrice: 35.00,
    service: { name: 'English Tutoring' },
    professional: { user: { firstName: 'Sara', lastName: 'Colombo', avatarUrl: undefined } },
    payment: { status: 'RELEASED', amount: 35.00 },
  },
  {
    id: 'booking-cal-3',
    clientId: 'user-client-1',
    professionalId: 'pro-giulia',
    serviceId: 'dog-walking',
    status: 'PENDING',
    scheduledAt: new Date(now.getFullYear(), now.getMonth(), 18, 8, 0).toISOString(),
    duration: 60,
    totalPrice: 15.00,
    service: { name: 'Dog Walking' },
    professional: { user: { firstName: 'Giulia', lastName: 'Conti', avatarUrl: undefined } },
    payment: null,
  },
  {
    id: 'booking-cal-4',
    clientId: 'user-client-1',
    professionalId: 'pro-alessia',
    serviceId: 'massage',
    status: 'ACCEPTED',
    scheduledAt: new Date(now.getFullYear(), now.getMonth(), 22, 11, 0).toISOString(),
    duration: 60,
    totalPrice: 50.00,
    service: { name: 'Massage' },
    professional: { user: { firstName: 'Alessia', lastName: 'Gallo', avatarUrl: undefined } },
    payment: { status: 'HELD', amount: 50.00 },
  },
  {
    id: 'booking-cal-5',
    clientId: 'user-client-1',
    professionalId: 'pro-davide',
    serviceId: 'haircut',
    status: 'IN_PROGRESS',
    scheduledAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0).toISOString(),
    duration: 45,
    totalPrice: 30.00,
    service: { name: 'Haircut' },
    professional: { user: { firstName: 'Davide', lastName: 'Romano', avatarUrl: undefined } },
    payment: { status: 'HELD', amount: 30.00 },
  },
  {
    id: 'booking-cal-6',
    clientId: 'user-client-1',
    professionalId: 'pro-andrea',
    serviceId: 'office-cleaning',
    status: 'COMPLETED',
    scheduledAt: new Date(now.getFullYear(), now.getMonth(), 25, 9, 0).toISOString(),
    duration: 180,
    totalPrice: 66.00,
    service: { name: 'Office Cleaning' },
    professional: { user: { firstName: 'Andrea', lastName: 'Moretti', avatarUrl: undefined } },
    payment: { status: 'RELEASED', amount: 66.00 },
  },
];
