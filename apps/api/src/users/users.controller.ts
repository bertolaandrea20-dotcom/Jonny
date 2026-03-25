import { Controller, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  update(@Request() req: any, @Body() dto: UpdateUserDto) {
    return this.usersService.update(req.user.sub, dto);
  }

  @Patch('me/location')
  @ApiOperation({ summary: 'Update current user geolocation' })
  updateLocation(
    @Request() req: any,
    @Body() body: { latitude: number; longitude: number },
  ) {
    return this.usersService.updateLocation(req.user.sub, body.latitude, body.longitude);
  }
}
