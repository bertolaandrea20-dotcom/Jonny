import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { MatchingService } from './matching.service';
import { SearchProfessionalsDto } from './dto/search.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Matching')
@Controller('matching')
export class MatchingController {
  constructor(private matchingService: MatchingService) {}

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search and rank professionals by service, location, and availability' })
  search(@Query() dto: SearchProfessionalsDto) {
    return this.matchingService.searchProfessionals(dto);
  }
}
