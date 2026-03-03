import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEmail,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCenterDto {
  @ApiProperty({ example: 'Centre de Transfusion Sanguine - Alger' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '1 Rue Didouche Mourad, Alger' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Alger' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: '+213 21 XX XX XX', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'centre.alger@bloodlink.dz', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 36.752887 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 3.042048 })
  @IsNumber()
  longitude: number;

  @ApiProperty({ example: 'Lun-Ven: 08h00-16h00', required: false })
  @IsString()
  @IsOptional()
  openingHours?: string;
}

export class UpdateCenterDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  openingHours?: string;
}