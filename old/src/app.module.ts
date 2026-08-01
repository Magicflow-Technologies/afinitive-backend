import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './modules/supabase/supabase.module';
import { RulesEngineModule } from './modules/rules-engine/rules-engine.module';
import { UsersModule } from './modules/users/users.module';
import { FichaMadreModule } from './modules/ficha-madre/ficha-madre.module';
import { DocumentosModule } from './modules/documentos/documentos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    RulesEngineModule,
    UsersModule,
    FichaMadreModule,
    DocumentosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
