import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3001),
  API_PREFIX: z.string().default('api/v1'),

  //Database
  DATABASE_URL: z.url('DATABASE_URL debe ser una URL válida'),

  //JWT
  JWT_SECRET: z.string().min(8, 'JWT_SECRET debe tener al menos 8 caracteres'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  TOKEN_ACCESO_EXPIRACION_DIAS: z.coerce.number().int().positive().default(30),

  // Logger
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive(),
  REDIS_PASSWORD: z.string().optional(),

  // Supabase Storage
  SUPABASE_URL: z.url('SUPABASE_URL debe ser una URL válida'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY es requerido'),
  SUPABASE_BUCKET_DOCUMENTOS: z.string().min(1, 'SUPABASE_BUCKET_DOCUMENTOS es requerido'),
});

export type EnvConfig = z.infer<typeof envSchema>;
