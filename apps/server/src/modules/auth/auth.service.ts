import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ==================== GEOCODING ====================
  private async geocodeCity(
    city: string,
  ): Promise<{ lat: number; lng: number } | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ', Algeria')}&format=json&limit=1`;
      const res  = await fetch(url, {
        headers: { 'User-Agent': 'BloodLink/1.0' },
      });
      const data = await res.json();
      if (data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
    } catch {
      // ignore — geocoding is optional
    }
    return null;
  }

  // ==================== INSCRIPTION ====================
  async register(dto: RegisterDto) {
    // Vérifier si l'email existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // ✅ Résoudre les coordonnées
    let latitude  = dto.latitude  ?? null;
    let longitude = dto.longitude ?? null;

    // ✅ Si city fournie mais pas de coordonnées → geocode automatique
    if (dto.city && !latitude && !longitude) {
      const geo = await this.geocodeCity(dto.city);
      if (geo) {
        latitude  = geo.lat;
        longitude = geo.lng;
      }
    }

    // Créer l'utilisateur
    const user = await this.prisma.user.create({
      data: {
        email:     dto.email,
        password:  hashedPassword,
        firstName: dto.firstName,
        lastName:  dto.lastName,
        phone:     dto.phone     ?? null,
        bloodGroup:dto.bloodGroup,
        role:      dto.role      || 'DONOR',
        city:      dto.city      ?? null,
        address:   dto.address   ?? null,
        latitude,
        longitude,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        bloodGroup: true,
        role: true,
        city: true,
        latitude: true,
        longitude: true,
        createdAt: true,
      },
    });

    // Générer le token JWT
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      message: 'Inscription réussie',
      user,
      accessToken: token,
    };
  }

  // ==================== CONNEXION ====================
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Ce compte a été désactivé');
    }

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
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        bloodGroup: true,
        role: true,
        avatar: true,
        isAvailable: true,
        isVerified: true,
        latitude: true,
        longitude: true,
        address: true,
        city: true,
        lastDonationAt: true,
        totalDonations: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    return user;
  }

  // ==================== HELPER ====================
  private generateToken(userId: string, email: string, role: string): string {
    return this.jwtService.sign({ sub: userId, email, role });
  }
}