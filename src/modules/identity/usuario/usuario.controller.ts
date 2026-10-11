import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { UsuarioService } from './usuario.service.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { CreateUsuarioClienteDto } from './dto/create-usuario-cliente.dto.js';
import { CreateUsuarioSistemaDto } from './dto/create-usuario-sistema.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';

@Controller('usuarios')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Post()
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuarioService.create(dto);
  }

  @Post('sistema')
  createForSistema(@Body() dto: CreateUsuarioSistemaDto) {
    return this.usuarioService.createForSistema(dto);
  }

  @Post('cliente')
  createForCliente(@Body() dto: CreateUsuarioClienteDto) {
    return this.usuarioService.createForCliente(dto);
  }

  @Get()
  findAll() {
    return this.usuarioService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuarioService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUsuarioDto) {
    return this.usuarioService.update(id, dto);
  }

  @Put(':id/rol')
  updateRol(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('rolId', ParseUUIDPipe) rolId: string,
  ) {
    return this.usuarioService.updateRol(id, rolId);
  }

  @Put(':id/reset-password')
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.usuarioService.resetPassword(id, dto.newPassword);
  }

  @Put(':id/toggle-activo')
  toggleActivo(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuarioService.toggleActivo(id);
  }

  @Put(':id/toggle-2fa')
  toggle2FA(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuarioService.toggle2FA(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuarioService.remove(id);
  }
}
