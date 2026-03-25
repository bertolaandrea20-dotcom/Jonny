import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceCategory } from '@prisma/client';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.service.findMany({
      orderBy: { category: 'asc' },
    });
  }

  async findByCategory(category: ServiceCategory) {
    return this.prisma.service.findMany({
      where: { category },
    });
  }

  async findById(id: string) {
    return this.prisma.service.findUnique({
      where: { id },
    });
  }
}
