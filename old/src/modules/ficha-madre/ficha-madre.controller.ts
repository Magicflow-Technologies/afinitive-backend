import { Controller, Post, Body, Req, UseGuards, UseFilters, HttpCode, HttpStatus } from '@nestjs/common';
import { FichaMadreService } from './ficha-madre.service';
import { CreateFichaMadreDto } from '../users/dto/create-ficha-madre.dto';
import { SupabaseAuthGuard } from '../supabase/guards/supabase-auth.guard';
import { DatabaseExceptionFilter } from '../../core/filters/database-exception.filter';

@Controller('ficha-madre')
@UseFilters(new DatabaseExceptionFilter())
export class FichaMadreController {
  constructor(private readonly fichaMadreService: FichaMadreService) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  async saveFichaMadre(
    @Req() req: any,
    @Body() dto: CreateFichaMadreDto,
  ) {
    // req.user es inyectado por SupabaseAuthGuard al autenticar exitosamente
    const userId = req.user.id;
    return this.fichaMadreService.saveFichaMadre(userId, dto);
  }
}
