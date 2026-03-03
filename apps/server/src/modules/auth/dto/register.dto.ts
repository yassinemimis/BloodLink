import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BloodGroup, Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'ahmed@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecureP@ss123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Ahmed' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Benali' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+213555123456', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ enum: BloodGroup, example: 'O_POSITIVE' })
  @IsEnum(BloodGroup)
  bloodGroup: BloodGroup;

  @ApiProperty({ enum: Role, example: 'DONOR', required: false })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiProperty({ example: 'Alger', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: 'Rue Didouche Mourad', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 36.75, required: false })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiProperty({ example: 3.04, required: false })
  @IsNumber()
  @IsOptional()
  longitude?: number;
}

export class LoginDto {
  @ApiProperty({ example: 'ahmed@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecureP@ss123' })
  @IsString()
  password: string;
}