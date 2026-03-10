import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService }    from '@nestjs/jwt';
import * as bcrypt       from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/register.dto';
import { MailService }   from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma:     PrismaService,
    private jwtService: JwtService,
    private mail:       MailService,  // ✅
  ) {}

  // ── Generate 6-digit code ─────────────────────────────────
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ==================== GEOCODING ====================
  private async geocodeCity(city: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ', Algeria')}&format=json&limit=1`;
      const res  = await fetch(url, { headers: { 'User-Agent': 'BloodLink/1.0' } });
      const data = await res.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch {
      // ignore — geocoding is optional
    }
    return null;
  }

  // ==================== INSCRIPTION ====================
  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) throw new ConflictException('Cet email est déjà utilisé');

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    let latitude  = dto.latitude  ?? null;
    let longitude = dto.longitude ?? null;
    if (dto.city && !latitude && !longitude) {
      const geo = await this.geocodeCity(dto.city);
      if (geo) { latitude = geo.lat; longitude = geo.lng; }
    }

    // ✅ Générer code de vérification
    const code    = this.generateCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    const user = await this.prisma.user.create({
      data: {
        email:      dto.email,
        password:   hashedPassword,
        firstName:  dto.firstName,
        lastName:   dto.lastName,
        phone:      dto.phone      ?? null,
        bloodGroup: dto.bloodGroup,
        role:       dto.role       || 'DONOR',
        city:       dto.city       ?? null,
        address:    dto.address    ?? null,
        latitude,
        longitude,
        emailVerificationCode:    code,      // ✅
        emailVerificationExpires: expires,   // ✅
        isVerified: false,
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        bloodGroup: true, role: true, city: true,
        latitude: true, longitude: true, createdAt: true,
      },
    });

    // ✅ Envoyer l'email de vérification
    try {
      await this.mail.sendVerificationEmail(user.email, user.firstName, code);
    } catch (err) {
      console.error('Mail error:', err);
    }

    const token = this.generateToken(user.id, user.email, user.role);
    return {
      message: 'Inscription réussie. Vérifiez votre email !',
      user,
      accessToken: token,
    };
  }

  // ==================== VERIFY EMAIL ====================
  async verifyEmail(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    if (user.isVerified) return { message: 'Email déjà vérifié' };

    if (!user.emailVerificationCode || !user.emailVerificationExpires)
      throw new BadRequestException('Aucun code de vérification trouvé');

    if (new Date() > user.emailVerificationExpires)
      throw new BadRequestException('Code expiré. Demandez un nouveau code.');

    if (user.emailVerificationCode !== code)
      throw new BadRequestException('Code incorrect');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isVerified:               true,
        emailVerificationCode:    null,
        emailVerificationExpires: null,
      },
    });

    return { message: '✅ Email vérifié avec succès !' };
  }

  // ==================== RESEND CODE ====================
  async resendVerificationCode(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    if (user.isVerified) return { message: 'Email déjà vérifié' };

    const code    = this.generateCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data:  { emailVerificationCode: code, emailVerificationExpires: expires },
    });

    await this.mail.sendVerificationEmail(user.email, user.firstName, code);
    return { message: 'Nouveau code envoyé !' };
  }

  // ==================== CONNEXION ====================
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Email ou mot de passe incorrect');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Email ou mot de passe incorrect');

    if (!user.isActive) throw new UnauthorizedException('Ce compte a été désactivé');

    const token = this.generateToken(user.id, user.email, user.role);
    return {
      message: 'Connexion réussie',
      user: {
        id:          user.id,
        email:       user.email,
        firstName:   user.firstName,
        lastName:    user.lastName,
        bloodGroup:  user.bloodGroup,
        role:        user.role,
        isAvailable: user.isAvailable,
        isVerified:  user.isVerified,
        latitude:    user.latitude,
        longitude:   user.longitude,
        city:        user.city,
        avatar:      user.avatar,
      },
      accessToken: token,
    };
  }

  // ==================== GET PROFILE ====================
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, bloodGroup: true, role: true, avatar: true,
        isAvailable: true, isVerified: true, latitude: true,
        longitude: true, address: true, city: true,
        lastDonationAt: true, totalDonations: true, createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException('Utilisateur non trouvé');
    return user;
  }

  // ==================== CHANGE PASSWORD ====================
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new ForbiddenException('Mot de passe actuel incorrect');

    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hash } });
    return { message: 'Mot de passe modifié avec succès' };
  }

  // ==================== HELPER ====================
  private generateToken(userId: string, email: string, role: string): string {
    return this.jwtService.sign({ sub: userId, email, role });
  }
}