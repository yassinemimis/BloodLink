import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsDateString, Min } from 'class-validator';

export class CreateCampaignDto {
  @IsString() @IsNotEmpty()
  centerId: string;

  @IsString() @IsNotEmpty()
  title: string;

  @IsString() @IsOptional()
  description?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber() @Min(1)
  goalUnits: number;
}

export class UpdateCampaignDto {
  @IsString() @IsOptional()
  centerId?: string;

  @IsString() @IsOptional()
  title?: string;

  @IsString() @IsOptional()
  description?: string;

  @IsDateString() @IsOptional()
  startDate?: string;

  @IsDateString() @IsOptional()
  endDate?: string;

  @IsNumber() @Min(1) @IsOptional()
  goalUnits?: number;

  @IsNumber() @Min(0) @IsOptional()
  collectedUnits?: number;

  @IsBoolean() @IsOptional()
  isActive?: boolean;
}