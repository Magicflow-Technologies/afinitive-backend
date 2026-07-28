import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto.js';

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAuditoriaDto) {
    return this.prisma.auditoria.create({ data: dto });
  }

  async findAll(params?: { skip?: number; take?: number; where?: any; orderBy?: any }) {
    return this.prisma.auditoria.findMany({ ...params, include: { usuario: { include: { persona: true } } } });
  }

  async findOne(id: string) {
    return this.prisma.auditoria.findUniqueOrThrow({ where: { id }, include: { usuario: { include: { persona: true } } } });
  }

  async findByEntidad(entidad: string, entidadId: string) {
    return this.prisma.auditoria.findMany({ where: { entidad, entidadId }, orderBy: { createdAt: 'desc' } });
  }
}
