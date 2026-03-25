import { PrismaClient, ServiceCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create service categories
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

  console.log(`✅ Seeded ${services.length} services`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
