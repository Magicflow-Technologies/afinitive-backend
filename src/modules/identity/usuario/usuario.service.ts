import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';

@Injectable()
export class UsuarioService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUsuarioDto) {
    return this.prisma.usuario.create({ data: dto, include: { persona: true, rol: true } });
  }

  async findAll() {
    return this.prisma.usuario.findMany({ include: { persona: true, rol: true } });
  }

  async findOne(id: string) {
    return this.prisma.usuario.findUniqueOrThrow({ where: { id }, include: { persona: true, rol: true } });
  }

  async update(id: string, dto: UpdateUsuarioDto) {
    return this.prisma.usuario.update({ where: { id }, data: dto, include: { persona: true, rol: true } });
  }

  async remove(id: string) {
    return this.prisma.usuario.delete({ where: { id } });
  }
}
