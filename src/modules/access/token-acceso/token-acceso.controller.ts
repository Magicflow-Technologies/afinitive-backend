import { Controller, Get, Post, Body, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { TokenAccesoService } from './token-acceso.service.js';
import { CreateTokenAccesoDto } from './dto/create-token-acceso.dto.js';

@Controller('tokens-acceso')
export class TokenAccesoController {
  constructor(private readonly service: TokenAccesoService) {}

  @Post()
  create(@Body() dto: CreateTokenAccesoDto) {
    return this.service.create(dto);
  }

  @Get('validate/:token')
  validate(@Param('token') token: string) {
    return this.service.validate(token);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/revoke')
  revoke(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.revoke(id);
  }

  @Put(':id/reactivate')
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.reactivate(id);
  }
}
