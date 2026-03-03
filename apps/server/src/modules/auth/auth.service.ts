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

    // Créer l'utilisateur
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        bloodGroup: dto.bloodGroup,
        role: dto.role || 'DONOR',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        bloodGroup: true,
        role: true,
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
    // Trouver l'utilisateur
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      throw new UnauthorizedException('Ce compte a été désactivé');
    }

    // Générer le token
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      message: 'Connexion réussie',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        bloodGroup: user.bloodGroup,
        role: user.role,
        isAvailable: user.isAvailable,
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
  private generateToken(
    userId: string,
    email: string,
    role: string,
  ): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      role,
    });
  }
}