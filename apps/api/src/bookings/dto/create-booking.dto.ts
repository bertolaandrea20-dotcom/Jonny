import { IsString, IsDateString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ description: 'Professional profile ID' })
  @IsString()
  professionalId: string;

  @ApiProperty({ description: 'Service ID' })
  @IsString()
  serviceId: string;

  @ApiProperty({ example: '2025-01-15T14:00:00Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ example: 60, description: 'Duration in minutes' })
  @IsNumber()
  @IsOptional()
  @Min(15)
  duration?: number;

  @ApiPropertyOptional({ example: 'Please bring your own cleaning supplies' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: '123 Rue de Paris' })
  @IsString()
  @IsOptional()
  address?: string;
}
