import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchProfessionalsDto {
  @ApiProperty({ description: 'Service ID to search for' })
  @IsString()
  serviceId: string;

  @ApiProperty({ example: 48.8566 })
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @ApiProperty({ example: 2.3522 })
  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @ApiPropertyOptional({ example: 20, description: 'Max distance in km (default 20)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  maxDistance?: number;

  @ApiPropertyOptional({ example: 1, description: 'Day of week (0=Sun, 6=Sat)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({ example: '14:00', description: 'Preferred time' })
  @IsString()
  @IsOptional()
  preferredTime?: string;
}
