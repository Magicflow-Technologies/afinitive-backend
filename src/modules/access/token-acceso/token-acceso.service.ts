import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateTokenAccesoDto } from './dto/create-token-acceso.dto.js';
import { randomBytes } from 'crypto';

@Injectable()
export class TokenAccesoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTokenAccesoDto) {
    const token = randomBytes(32).toString('hex');
    const expiraEn = new Date();
    expiraEn.setHours(expiraEn.getHours() + 24);

    return this.prisma.tokenAcceso.create({
      data: { ...dto, token, expiraEn },
      include: { fichaMadre: true },
    });
  }

  async validate(token: string) {
    const tokenAcceso = await this.prisma.tokenAcceso.findUnique({ where: { token } });
    if (!tokenAcceso) throw new NotFoundException('Token no encontrado');
    if (tokenAcceso.estado !== 'ACTIVO') throw new UnauthorizedException('Token no valido');
    if (new Date() > tokenAcceso.expiraEn) {
      await this.prisma.tokenAcceso.update({ where: { id: tokenAcceso.id }, data: { estado: 'EXPIRADO' } });
      throw new UnauthorizedException('Token expirado');
    }
    if (tokenAcceso.intentos >= tokenAcceso.maxIntentos) {
      await this.prisma.tokenAcceso.update({ where: { id: tokenAcceso.id }, data: { estado: 'REVOCADO' } });
      throw new UnauthorizedException('Token revocado por exceso de intentos');
    }

    await this.prisma.tokenAcceso.update({
      where: { id: tokenAcceso.id },
      data: { intentos: { increment: 1 }, usadoEn: new Date(), estado: 'USADO' },
    });

    return tokenAcceso;
  }

  async findAll() {
    return this.prisma.tokenAcceso.findMany({ include: { fichaMadre: true } });
  }

  async findOne(id: string) {
    return this.prisma.tokenAcceso.findUniqueOrThrow({ where: { id }, include: { fichaMadre: true } });
  }
}
