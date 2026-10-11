import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { CreateUsuarioClienteDto } from './dto/create-usuario-cliente.dto.js';
import { CreateUsuarioSistemaDto } from './dto/create-usuario-sistema.dto.js';
import bcryptjs from 'bcryptjs';

@Injectable()
export class UsuarioService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUsuarioDto) {
    return this.prisma.usuario.create({
      data: dto,
      include: { persona: { include: { empleado: true } }, rol: true },
    });
  }

  async findAll() {
    return this.prisma.usuario.findMany({
      include: {
        persona: {
          include: {
            empleado: true,
          },
        },
        rol: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.usuario.findUniqueOrThrow({
      where: { id },
      include: {
        persona: {
          include: {
            empleado: true,
          },
        },
        rol: true,
      },
    });
  }

  async update(id: string, dto: UpdateUsuarioDto) {
    return this.prisma.usuario.update({
      where: { id },
      data: dto,
      include: {
        persona: {
          include: {
            empleado: true,
          },
        },
        rol: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.usuario.delete({ where: { id } });
  }

  /**
   * Crea un usuario interno del sistema (Analista, Operador, Administrador, Gerencia),
   * registrando o actualizando la Persona y el Empleado.
   */
  async createForSistema(dto: CreateUsuarioSistemaDto) {
    const cleanUsername = dto.username.trim().toLowerCase();

    // 1. Verificar si el username ya está en uso
    const usernameEnUso = await this.prisma.usuario.findUnique({
      where: { username: cleanUsername },
    });

    if (usernameEnUso) {
      throw new BadRequestException('El nombre de usuario ya está registrado.');
    }

    // 2. Verificar rol
    const rol = await this.prisma.rol.findUnique({
      where: { id: dto.rolId },
    });

    if (!rol) {
      throw new NotFoundException('El rol seleccionado no existe.');
    }

    // 3. Upsert Persona
    const persona = await this.prisma.persona.upsert({
      where: {
        uk_persona_documento: {
          tipoDocumento: dto.tipoDocumento,
          numeroDocumento: dto.numeroDocumento.trim(),
        },
      },
      update: {
        nombres: dto.nombres.trim(),
        apellidos: dto.apellidos.trim(),
        correo: dto.correo.trim().toLowerCase(),
        telefono: dto.telefono?.trim(),
      },
      create: {
        tipoDocumento: dto.tipoDocumento,
        numeroDocumento: dto.numeroDocumento.trim(),
        nombres: dto.nombres.trim(),
        apellidos: dto.apellidos.trim(),
        correo: dto.correo.trim().toLowerCase(),
        telefono: dto.telefono?.trim(),
      },
    });

    // 4. Verificar si esta persona ya tiene usuario asignado
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { personaId: persona.id },
    });

    if (usuarioExistente) {
      throw new BadRequestException('Esta persona ya tiene una cuenta de usuario asignada.');
    }

    // 5. Upsert Empleado
    await this.prisma.empleado.upsert({
      where: { personaId: persona.id },
      update: {
        cargo: dto.cargo.trim(),
        area: dto.area?.trim(),
      },
      create: {
        personaId: persona.id,
        cargo: dto.cargo.trim(),
        area: dto.area?.trim(),
      },
    });

    // 6. Hashear contraseña y crear usuario
    const passwordHash = bcryptjs.hashSync(dto.password, 10);

    return this.prisma.usuario.create({
      data: {
        personaId: persona.id,
        rolId: rol.id,
        username: cleanUsername,
        passwordHash,
        requiere2FA: dto.requiere2FA ?? false,
        activo: true,
        debeCambiarPassword: true,
      },
      include: {
        persona: {
          include: {
            empleado: true,
          },
        },
        rol: true,
      },
    });
  }

  /**
   * Crea un usuario para un Cliente existente
   */
  async createForCliente(dto: CreateUsuarioClienteDto) {
    const { clienteId, username, password, requiere2FA } = dto;
    const cleanUsername = username.trim().toLowerCase();

    // 1. Verificar si el cliente existe
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      include: { persona: true },
    });

    if (!cliente) {
      throw new NotFoundException('El cliente especificado no existe.');
    }

    // 2. Verificar si la persona ya tiene cuenta de usuario
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { personaId: cliente.personaId },
    });

    if (usuarioExistente) {
      throw new BadRequestException('Este cliente ya tiene un usuario registrado.');
    }

    // 3. Verificar si el username está en uso
    const usernameEnUso = await this.prisma.usuario.findUnique({
      where: { username: cleanUsername },
    });

    if (usernameEnUso) {
      throw new BadRequestException('El nombre de usuario ya está en uso. Por favor, elige otro.');
    }

    // 4. Buscar o crear el rol "cliente"
    let rol = await this.prisma.rol.findFirst({
      where: {
        nombre: {
          equals: 'cliente',
          mode: 'insensitive',
        },
      },
    });

    if (!rol) {
      rol = await this.prisma.rol.create({
        data: {
          nombre: 'cliente',
          descripcion: 'Acceso para clientes e inversionistas al onboarding y firma',
          permisos: ['onboarding:read', 'onboarding:write', 'documentos:read', 'documentos:sign'],
        },
      });
    }

    // 5. Hashear contraseña
    const passwordHash = bcryptjs.hashSync(password, 10);

    // 6. Crear el usuario
    return this.prisma.usuario.create({
      data: {
        personaId: cliente.personaId,
        rolId: rol.id,
        username: cleanUsername,
        passwordHash,
        requiere2FA: requiere2FA ?? true,
        activo: true,
        debeCambiarPassword: true,
      },
      include: {
        persona: true,
        rol: true,
      },
    });
  }

  /**
   * Actualiza el rol asignado a un usuario
   */
  async updateRol(usuarioId: string, rolId: string) {
    const rol = await this.prisma.rol.findUnique({ where: { id: rolId } });
    if (!rol) throw new NotFoundException('Rol no encontrado.');

    return this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { rolId },
      include: {
        persona: {
          include: {
            empleado: true,
          },
        },
        rol: true,
      },
    });
  }

  /**
   * Restablece la contraseña de un usuario
   */
  async resetPassword(usuarioId: string, newPassword: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const passwordHash = bcryptjs.hashSync(newPassword, 10);
    return this.prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        passwordHash,
        debeCambiarPassword: true,
        passwordCambiadoEn: new Date(),
        bloqueadoHasta: null,
        intentosFallidos: 0,
      },
      include: {
        persona: {
          include: {
            empleado: true,
          },
        },
        rol: true,
      },
    });
  }

  /**
   * Alterna el estado activo / inactivo
   */
  async toggleActivo(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    return this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { activo: !usuario.activo },
      include: {
        persona: {
          include: {
            empleado: true,
          },
        },
        rol: true,
      },
    });
  }

  /**
   * Alterna la exigencia de 2FA
   */
  async toggle2FA(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    return this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { requiere2FA: !usuario.requiere2FA },
      include: {
        persona: {
          include: {
            empleado: true,
          },
        },
        rol: true,
      },
    });
  }
}
