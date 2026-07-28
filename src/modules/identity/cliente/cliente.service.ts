import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateClienteDto } from './dto/create-cliente.dto.js';
import { UpdateClienteDto } from './dto/update-cliente.dto.js';

@Injectable()
export class ClienteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClienteDto) {
    return this.prisma.cliente.create({ data: dto, include: { persona: true } });
  }

  async findAll() {
    return this.prisma.cliente.findMany({ include: { persona: true } });
  }

  async findOne(id: string) {
    return this.prisma.cliente.findUniqueOrThrow({ where: { id }, include: { persona: true, fichaMadre: true } });
  }

  async update(id: string, dto: UpdateClienteDto) {
    return this.prisma.cliente.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.cliente.delete({ where: { id } });
  }
}
