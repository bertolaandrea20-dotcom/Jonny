import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfessionalProfileDto {
  @ApiPropertyOptional({ example: 'Experienced tutor with 5 years of experience' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsNumber()
  @IsOptional()
  @Min(18)
  @Max(100)
  age?: number;

  @ApiPropertyOptional({ example: 15, description: 'Service radius in km' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  serviceRadius?: number;

  @ApiPropertyOptional({ example: 25.0, description: 'Hourly rate in EUR' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  hourlyRate?: number;
}
