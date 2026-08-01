import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private supabaseClient!: SupabaseClient<any, any, any>;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');

    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project-id')) {
      this.logger.warn(
        'Supabase URL or Key is not configured. Please check your environment variables.',
      );
      return;
    }

    this.supabaseClient = createClient(supabaseUrl, supabaseKey, {
      db: {
        schema: 'afinitivebd',
      },
    });
    this.logger.log('Supabase client initialized successfully.');
  }

  getClient(): SupabaseClient {
    if (!this.supabaseClient) {
      throw new Error(
        'Supabase client has not been initialized. Check your environment variables.',
      );
    }
    return this.supabaseClient;
  }
}
