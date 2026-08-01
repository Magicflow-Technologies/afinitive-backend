import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RulesEngineModule } from '../rules-engine/rules-engine.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [RulesEngineModule, SupabaseModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
