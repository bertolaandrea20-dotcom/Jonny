import {
  Controller, Get, Patch, Post, Delete,
  Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProfessionalsService } from './professionals.service';
import { UpdateProfessionalProfileDto } from './dto/update-profile.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Professionals')
@Controller('professionals')
export class ProfessionalsController {
  constructor(private professionalsService: ProfessionalsService) {}

  // ─── Public endpoints ───────────────────────────

  @Get(':id/public')
  @ApiOperation({ summary: 'Get professional public profile (no auth required)' })
  getPublicProfile(@Param('id') id: string) {
    return this.professionalsService.getPublicProfile(id);
  }

  // ─── Authenticated endpoints ────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my professional profile' })
  getMyProfile(@Request() req: any) {
    return this.professionalsService.getProfile(req.user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my professional profile' })
  updateProfile(@Request() req: any, @Body() dto: UpdateProfessionalProfileDto) {
    return this.professionalsService.updateProfile(req.user.sub, dto);
  }

  @Post('me/availability')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set weekly availability (replaces existing)' })
  setAvailability(@Request() req: any, @Body() dto: SetAvailabilityDto) {
    return this.professionalsService.setAvailability(req.user.sub, dto);
  }

  @Post('me/services/:serviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a service to my profile' })
  addService(
    @Request() req: any,
    @Param('serviceId') serviceId: string,
    @Body() body: { customRate?: number },
  ) {
    return this.professionalsService.addService(req.user.sub, serviceId, body.customRate);
  }

  @Delete('me/services/:serviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a service from my profile' })
  removeService(@Request() req: any, @Param('serviceId') serviceId: string) {
    return this.professionalsService.removeService(req.user.sub, serviceId);
  }
}
