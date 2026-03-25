import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { ServiceCategory } from '@prisma/client';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'List all available services' })
  @ApiQuery({ name: 'category', enum: ServiceCategory, required: false })
  findAll(@Query('category') category?: ServiceCategory) {
    if (category) {
      return this.servicesService.findByCategory(category);
    }
    return this.servicesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service by ID' })
  findById(@Param('id') id: string) {
    return this.servicesService.findById(id);
  }
}
