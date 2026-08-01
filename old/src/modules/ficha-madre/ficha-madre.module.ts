import { Module } from '@nestjs/common';
import { FichaMadreService } from './ficha-madre.service';
import { FichaMadreController } from './ficha-madre.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [FichaMadreController],
  providers: [FichaMadreService],
})
export class FichaMadreModule {}
