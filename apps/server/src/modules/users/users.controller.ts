import {
  Controller, Get, Patch, Post, Param,
  Body, Query, UseGuards, Req,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor }                        from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth,
         ApiQuery, ApiConsumes, ApiBody }         from '@nestjs/swagger';
import { UsersService }                           from './users.service';
import { CloudinaryService }                      from '../upload/cloudinary.service';
import { JwtAuthGuard }                           from '../auth/guards/jwt-auth.guard';
import { BloodGroup }                             from '@prisma/client';
import { Roles, RolesGuard }                      from '../auth/guards/roles.guard';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinary:   CloudinaryService,
  ) {}

  // ── Donneurs ──────────────────────────────────────────────
  @Get('donors')
  @ApiOperation({ summary: 'Lister tous les donneurs' })
  @ApiQuery({ name: 'bloodGroup', enum: BloodGroup, required: false })
  @ApiQuery({ name: 'city',       type: String,     required: false })
  @ApiQuery({ name: 'isAvailable',type: Boolean,    required: false })
  findAllDonors(
    @Query('bloodGroup')  bloodGroup?:  BloodGroup,
    @Query('city')        city?:        string,
    @Query('isAvailable') isAvailable?: boolean,
    @Query('page')        page?:        number,
    @Query('limit')       limit?:       number,
  ) {
    return this.usersService.findAllDonors({ bloodGroup, city, isAvailable, page, limit });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques globales' })
  getStats() { return this.usersService.getGlobalStats(); }

  // ── Toggle Availability ───────────────────────────────────
  @Patch('toggle-availability')
  @ApiOperation({ summary: 'Basculer la disponibilité' })
  toggleAvailability(@Req() req: any) {
    return this.usersService.toggleAvailability(req.user.sub);
  }

  // ── Location ──────────────────────────────────────────────
  @Patch('location')
  @ApiOperation({ summary: 'Mettre à jour la localisation' })
  updateLocation(
    @Req() req: any,
    @Body() body: { latitude: number; longitude: number; address?: string; city?: string },
  ) {
    return this.usersService.updateLocation(
      req.user.sub, body.latitude, body.longitude, body.address, body.city,
    );
  }

  // ── Profile (phone, address, city) ───────────────────────
  @Patch('profile')
  @ApiOperation({ summary: 'Mettre à jour le profil' })
  updateProfile(
    @Req() req: any,
    @Body() body: { phone?: string; address?: string; city?: string },
  ) {
    return this.usersService.updateProfile(req.user.sub, body);
  }

  // ✅ ── Avatar Upload ──────────────────────────────────────
  @Post('avatar')
  @ApiOperation({ summary: 'Uploader une photo de profil (Cloudinary)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
    fileFilter: (_, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|png|webp|gif)$/)) {
        return cb(new BadRequestException('Format non supporté (jpeg/png/webp)'), false);
      }
      cb(null, true);
    },
  }))
  async uploadAvatar(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');

    // حذف الصورة القديمة من Cloudinary إذا وُجدت
    const currentUser = await this.usersService.findOne(req.user.sub);
    if (currentUser.avatar) {
      await this.cloudinary.deleteImage(currentUser.avatar);
    }

    // رفع الصورة الجديدة
    const avatarUrl = await this.cloudinary.uploadImage(file);

    // حفظ الـ URL في الـ DB
    return this.usersService.updateProfile(req.user.sub, { avatar: avatarUrl });
  }

  // ── Admin ─────────────────────────────────────────────────
  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Lister tous les utilisateurs (Admin)' })
  @ApiQuery({ name: 'role',       required: false })
  @ApiQuery({ name: 'isVerified', type: Boolean, required: false })
  @ApiQuery({ name: 'search',     required: false })
  @ApiQuery({ name: 'page',       type: Number,  required: false })
  @ApiQuery({ name: 'limit',      type: Number,  required: false })
  findAllUsers(
    @Query('role')       role?:       string,
    @Query('isVerified') isVerified?: boolean,
    @Query('search')     search?:     string,
    @Query('page')       page?:       number,
    @Query('limit')      limit?:      number,
  ) {
    return this.usersService.findAllUsers({ role, isVerified, search, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: "Détails d'un utilisateur" })
  findOne(@Param('id') id: string) { return this.usersService.findOne(id); }

  @Patch(':id/verify')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Vérifier / dévérifier (Admin)' })
  toggleVerification(@Param('id') id: string) {
    return this.usersService.toggleVerification(id);
  }
}