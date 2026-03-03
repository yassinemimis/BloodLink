import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BloodGroup, UrgencyLevel } from '@prisma/client';

export class CreateBloodRequestDto {
  @ApiProperty({ enum: BloodGroup, example: 'O_POSITIVE' })
  @IsEnum(BloodGroup)
  bloodGroup: BloodGroup;

  @ApiProperty({ enum: UrgencyLevel, example: 'HIGH' })
  @IsEnum(UrgencyLevel)
  urgencyLevel: UrgencyLevel;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  @Max(20)
  unitsNeeded: number;

  @ApiProperty({ example: 'CHU Mustapha Pacha' })
  @IsString()
  @IsNotEmpty()
  hospital: string;

  @ApiProperty({ example: 'Patient nécessite une transfusion post-opératoire' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 36.752887 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 3.042048 })
  @IsNumber()
  longitude: number;

  @ApiProperty({ example: 25, required: false })
  @IsInt()
  @IsOptional()
  searchRadius?: number;
}