import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateRolDto } from './dto/create-rol.dto.js';
import { UpdateRolDto } from './dto/update-rol.dto.js';

@Injectable()
export class RolService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRolDto) {
    return this.prisma.rol.create({ data: dto });
  }

  async findAll() {
    return this.prisma.rol.findMany();
  }

  async findOne(id: string) {
    return this.prisma.rol.findUniqueOrThrow({ where: { id } });
  }

  async update(id: string, dto: UpdateRolDto) {
    return this.prisma.rol.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.rol.delete({ where: { id } });
  }
}
