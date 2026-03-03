import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDonationDto {
  @ApiProperty({ example: 'uuid-de-la-demande' })
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @ApiProperty({ example: '2026-03-10T10:00:00Z', required: false })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiProperty({ example: 'Je suis disponible demain matin', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}