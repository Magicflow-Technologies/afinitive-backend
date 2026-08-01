import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreatePersonaDto } from './dto/create-persona.dto.js';
import { UpdatePersonaDto } from './dto/update-persona.dto.js';
import { Prisma } from '../../../generated/prisma/index.js';

@Injectable()
export class PersonaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePersonaDto) {
    return this.prisma.persona.create({ data: dto });
  }

  async findAll(params?: { skip?: number; take?: number; where?: Prisma.PersonaWhereInput; orderBy?: Prisma.PersonaOrderByWithRelationInput }) {
    const { skip, take, where, orderBy } = params ?? {};
    return this.prisma.persona.findMany({ skip, take, where, orderBy });
  }

  async findOne(id: string) {
    return this.prisma.persona.findUniqueOrThrow({ where: { id } });
  }

  async findByDocumento(tipoDocumento: string, numeroDocumento: string) {
    return this.prisma.persona.findUnique({
      where: { uk_persona_documento: { tipoDocumento: tipoDocumento as any, numeroDocumento } },
    });
  }

  async update(id: string, dto: UpdatePersonaDto) {
    return this.prisma.persona.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.persona.delete({ where: { id } });
  }
}
