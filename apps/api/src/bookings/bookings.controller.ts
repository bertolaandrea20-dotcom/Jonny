import {
  Controller, Get, Post, Patch, Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BookingStatus } from '@prisma/client';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking (client)' })
  create(@Request() req: any, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(req.user.sub, dto);
  }

  @Get('client')
  @ApiOperation({ summary: 'Get my bookings as client' })
  findClientBookings(@Request() req: any) {
    return this.bookingsService.findClientBookings(req.user.sub);
  }

  @Get('professional')
  @ApiOperation({ summary: 'Get my bookings as professional' })
  findProfessionalBookings(@Request() req: any) {
    return this.bookingsService.findProfessionalBookings(req.user.sub);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update booking status' })
  updateStatus(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { status: BookingStatus },
  ) {
    return this.bookingsService.updateStatus(id, req.user.sub, body.status);
  }
}
