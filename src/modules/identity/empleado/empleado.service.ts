import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateEmpleadoDto } from './dto/create-empleado.dto.js';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto.js';

@Injectable()
export class EmpleadoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEmpleadoDto) {
    return this.prisma.empleado.create({ data: dto, include: { persona: true } });
  }

  async findAll() {
    return this.prisma.empleado.findMany({ include: { persona: true } });
  }

  async findOne(id: string) {
    return this.prisma.empleado.findUniqueOrThrow({ where: { id }, include: { persona: true, fichasMadre: true } });
  }

  async update(id: string, dto: UpdateEmpleadoDto) {
    return this.prisma.empleado.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.empleado.delete({ where: { id } });
  }
}
