import { PrismaClient, ServiceCategory, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── Services ───
  const services = [
    { name: 'Math Tutoring', category: ServiceCategory.TUTORING, description: 'Private math lessons for all levels', icon: '📐' },
    { name: 'English Tutoring', category: ServiceCategory.TUTORING, description: 'English language and literature tutoring', icon: '📚' },
    { name: 'Science Tutoring', category: ServiceCategory.TUTORING, description: 'Physics, chemistry, and biology tutoring', icon: '🔬' },
    { name: 'Home Cleaning', category: ServiceCategory.CLEANING, description: 'Regular house cleaning service', icon: '🧹' },
    { name: 'Deep Cleaning', category: ServiceCategory.CLEANING, description: 'Thorough deep cleaning for homes', icon: '✨' },
    { name: 'Office Cleaning', category: ServiceCategory.CLEANING, description: 'Professional office cleaning', icon: '🏢' },
    { name: 'Haircut', category: ServiceCategory.PERSONAL_CARE, description: 'Professional haircut at home', icon: '💇' },
    { name: 'Massage', category: ServiceCategory.PERSONAL_CARE, description: 'Relaxation and therapeutic massage', icon: '💆' },
    { name: 'Manicure & Pedicure', category: ServiceCategory.PERSONAL_CARE, description: 'Nail care services at home', icon: '💅' },
    { name: 'Babysitting', category: ServiceCategory.BABYSITTING, description: 'Childcare for infants and toddlers', icon: '👶' },
    { name: 'After-School Care', category: ServiceCategory.BABYSITTING, description: 'After-school childcare and homework help', icon: '🎒' },
    { name: 'Dog Walking', category: ServiceCategory.PET_SITTING, description: 'Daily dog walking service', icon: '🐕' },
    { name: 'Pet Sitting', category: ServiceCategory.PET_SITTING, description: 'In-home pet care while you are away', icon: '🐾' },
    { name: 'Cat Sitting', category: ServiceCategory.PET_SITTING, description: 'Cat feeding and care visits', icon: '🐱' },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { id: service.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        id: service.name.toLowerCase().replace(/\s+/g, '-'),
        ...service,
      },
    });
  }
  console.log(`Seeded ${services.length} services`);

  // ─── Demo Users ───
  const passwordHash = await bcrypt.hash('password123', 10);

  // Client
  const client = await prisma.user.upsert({
    where: { email: 'client@test.com' },
    update: {},
    create: {
      email: 'client@test.com',
      password: passwordHash,
      firstName: 'Alex',
      lastName: 'Demo',
      role: UserRole.CLIENT,
      latitude: 48.8566,
      longitude: 2.3522,
    },
  });
  console.log('Seeded demo client:', client.email);

  // Professional 1 - Marie (cleaning + personal care)
  const marie = await prisma.user.upsert({
    where: { email: 'marie@test.com' },
    update: {},
    create: {
      email: 'marie@test.com',
      password: passwordHash,
      firstName: 'Marie',
      lastName: 'Dupont',
      role: UserRole.PROFESSIONAL,
      latitude: 48.8606,
      longitude: 2.3376,
    },
  });

  const marieProfile = await prisma.professionalProfile.upsert({
    where: { userId: marie.id },
    update: {},
    create: {
      userId: marie.id,
      bio: 'Professional cleaner with 5 years of experience. I love making homes sparkle!',
      age: 32,
      serviceRadius: 15,
      hourlyRate: 35,
      isVerified: true,
      stripeAccountId: 'demo_account',
    },
  });

  // Marie's services
  for (const sid of ['home-cleaning', 'deep-cleaning', 'haircut']) {
    await prisma.proService.upsert({
      where: { professionalId_serviceId: { professionalId: marieProfile.id, serviceId: sid } },
      update: {},
      create: { professionalId: marieProfile.id, serviceId: sid },
    });
  }

  // Marie's availability (Mon-Fri 9-17)
  for (let day = 1; day <= 5; day++) {
    await prisma.availability.upsert({
      where: { professionalId_dayOfWeek_startTime: { professionalId: marieProfile.id, dayOfWeek: day, startTime: '09:00' } },
      update: {},
      create: { professionalId: marieProfile.id, dayOfWeek: day, startTime: '09:00', endTime: '17:00' },
    });
  }
  console.log('Seeded pro: Marie Dupont');

  // Professional 2 - Lucas (tutoring)
  const lucas = await prisma.user.upsert({
    where: { email: 'lucas@test.com' },
    update: {},
    create: {
      email: 'lucas@test.com',
      password: passwordHash,
      firstName: 'Lucas',
      lastName: 'Martin',
      role: UserRole.PROFESSIONAL,
      latitude: 48.8530,
      longitude: 2.3499,
    },
  });

  const lucasProfile = await prisma.professionalProfile.upsert({
    where: { userId: lucas.id },
    update: {},
    create: {
      userId: lucas.id,
      bio: 'Mathematics teacher with a passion for making complex concepts simple.',
      age: 28,
      serviceRadius: 20,
      hourlyRate: 45,
      isVerified: true,
    },
  });

  for (const sid of ['math-tutoring', 'science-tutoring']) {
    await prisma.proService.upsert({
      where: { professionalId_serviceId: { professionalId: lucasProfile.id, serviceId: sid } },
      update: {},
      create: { professionalId: lucasProfile.id, serviceId: sid },
    });
  }

  for (let day = 1; day <= 6; day++) {
    await prisma.availability.upsert({
      where: { professionalId_dayOfWeek_startTime: { professionalId: lucasProfile.id, dayOfWeek: day, startTime: '10:00' } },
      update: {},
      create: { professionalId: lucasProfile.id, dayOfWeek: day, startTime: '10:00', endTime: '20:00' },
    });
  }
  console.log('Seeded pro: Lucas Martin');

  // Professional 3 - Sophie (babysitting + pet sitting)
  const sophie = await prisma.user.upsert({
    where: { email: 'sophie@test.com' },
    update: {},
    create: {
      email: 'sophie@test.com',
      password: passwordHash,
      firstName: 'Sophie',
      lastName: 'Bernard',
      role: UserRole.PROFESSIONAL,
      latitude: 48.8650,
      longitude: 2.3800,
    },
  });

  const sophieProfile = await prisma.professionalProfile.upsert({
    where: { userId: sophie.id },
    update: {},
    create: {
      userId: sophie.id,
      bio: 'Certified childcare professional. I adore kids and animals!',
      age: 25,
      serviceRadius: 10,
      hourlyRate: 25,
      isVerified: true,
    },
  });

  for (const sid of ['babysitting', 'after-school-care', 'dog-walking', 'pet-sitting']) {
    await prisma.proService.upsert({
      where: { professionalId_serviceId: { professionalId: sophieProfile.id, serviceId: sid } },
      update: {},
      create: { professionalId: sophieProfile.id, serviceId: sid },
    });
  }

  for (let day = 0; day <= 6; day++) {
    await prisma.availability.upsert({
      where: { professionalId_dayOfWeek_startTime: { professionalId: sophieProfile.id, dayOfWeek: day, startTime: '08:00' } },
      update: {},
      create: { professionalId: sophieProfile.id, dayOfWeek: day, startTime: '08:00', endTime: '22:00' },
    });
  }
  console.log('Seeded pro: Sophie Bernard');

  // ─── Demo Reviews ───
  // Create a completed booking + review for Marie
  const existingBooking = await prisma.booking.findFirst({
    where: { clientId: client.id, professionalId: marieProfile.id },
  });

  if (!existingBooking) {
    const booking = await prisma.booking.create({
      data: {
        clientId: client.id,
        professionalId: marieProfile.id,
        serviceId: 'home-cleaning',
        status: 'COMPLETED',
        scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        duration: 120,
        totalPrice: 70,
      },
    });

    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: 70,
        currency: 'EUR',
        status: 'RELEASED',
        stripePaymentId: 'demo_pi_001',
      },
    });

    await prisma.review.create({
      data: {
        bookingId: booking.id,
        reviewerId: client.id,
        professionalId: marieProfile.id,
        rating: 5,
        comment: 'Marie did an amazing job! My apartment has never been this clean.',
      },
    });
    console.log('Seeded demo booking + review');
  }

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
