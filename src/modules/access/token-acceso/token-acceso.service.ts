import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateTokenAccesoDto } from './dto/create-token-acceso.dto.js';
import { randomBytes } from 'crypto';

const DEFAULT_TOKEN_EXPIRATION_DAYS = 30;

@Injectable()
export class TokenAccesoService {
  constructor(private readonly prisma: PrismaService) {}

  private getTokenExpirationDays() {
    const parsed = Number.parseInt(process.env.TOKEN_ACCESO_EXPIRACION_DIAS ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TOKEN_EXPIRATION_DAYS;
  }

  private normalizeDocumentosFirmaCantidad(value?: number | null) {
    if (value === 2 || value === 5 || value === 7) {
      return value;
    }

    return 5;
  }

  async create(dto: CreateTokenAccesoDto) {
    await this.prisma.tokenAcceso.updateMany({
      where: {
        fichaMadreId: dto.fichaMadreId,
        estado: 'ACTIVO',
      },
      data: {
        estado: 'REVOCADO',
      },
    });

    const token = randomBytes(32).toString('hex');
    const expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + this.getTokenExpirationDays());
    const documentosFirmaCantidad = this.normalizeDocumentosFirmaCantidad(dto.documentosFirmaCantidad);

    return this.prisma.tokenAcceso.create({
      data: { ...dto, documentosFirmaCantidad, token, expiraEn },
      include: { fichaMadre: true },
    });
  }

  async validate(token: string) {
    const tokenAcceso = await this.prisma.tokenAcceso.findUnique({ where: { token } });
    if (!tokenAcceso) throw new NotFoundException('Token no encontrado');
    if (tokenAcceso.estado === 'REVOCADO') throw new UnauthorizedException('Token cerrado');
    if (tokenAcceso.estado === 'EXPIRADO') throw new UnauthorizedException('Token expirado');
    if (new Date() > tokenAcceso.expiraEn) {
      await this.prisma.tokenAcceso.update({ where: { id: tokenAcceso.id }, data: { estado: 'EXPIRADO' } });
      throw new UnauthorizedException('Token expirado');
    }

    await this.prisma.tokenAcceso.update({
      where: { id: tokenAcceso.id },
      data: {
        intentos: { increment: 1 },
        usadoEn: new Date(),
      },
    });

    return tokenAcceso;
  }

  async findAll() {
    return this.prisma.tokenAcceso.findMany({ include: { fichaMadre: true } });
  }

  async findOne(id: string) {
    return this.prisma.tokenAcceso.findUniqueOrThrow({ where: { id }, include: { fichaMadre: true } });
  }

  async revoke(id: string) {
    const tokenAcceso = await this.prisma.tokenAcceso.findUnique({ where: { id } });
    if (!tokenAcceso) throw new NotFoundException('Token no encontrado');

    return this.prisma.tokenAcceso.update({
      where: { id },
      data: { estado: 'REVOCADO' },
      include: { fichaMadre: true },
    });
  }

  async reactivate(id: string) {
    const tokenAcceso = await this.prisma.tokenAcceso.findUnique({ where: { id } });
    if (!tokenAcceso) throw new NotFoundException('Token no encontrado');

    const expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + this.getTokenExpirationDays());

    return this.prisma.tokenAcceso.update({
      where: { id },
      data: {
        estado: 'ACTIVO',
        expiraEn,
        usadoEn: null,
        intentos: 0,
      },
      include: { fichaMadre: true },
    });
  }
}
