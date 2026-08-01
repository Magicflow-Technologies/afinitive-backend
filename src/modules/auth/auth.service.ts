import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../core/database/prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import bcryptjs from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const { username, password } = dto;

    // Buscar el usuario por username
    const usuario = await this.prisma.usuario.findUnique({
      where: { username },
      include: {
        rol: true,
        persona: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('El usuario no existe.');
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('El usuario está inactivo.');
    }

    // Validar contraseña (soporta bcrypt y texto plano para desarrollo local)
    let passwordValid = false;
    try {
      passwordValid = bcryptjs.compareSync(password, usuario.passwordHash);
    } catch {
      // Ignorar error de salt/bcrypt y verificar texto plano
    }

    if (!passwordValid && password === usuario.passwordHash) {
      passwordValid = true;
    }

    if (!passwordValid) {
      throw new UnauthorizedException('Contraseña incorrecta.');
    }

    // Actualizar último acceso
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcceso: new Date() },
    });

    // Generar Payload para JWT
    const payload = {
      sub: usuario.id,
      username: usuario.username,
      rol: usuario.rol.nombre,
      personaId: usuario.personaId,
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol.nombre,
        persona: {
          id: usuario.persona.id,
          nombres: usuario.persona.nombres,
          apellidos: usuario.persona.apellidos,
          correo: usuario.persona.correo,
        },
      },
    };
  }
}
