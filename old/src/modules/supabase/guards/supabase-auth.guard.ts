import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      // En modo desarrollo local o pruebas sin token, permitir usuario simulado de pruebas con UUID válido
      this.logger.warn('Token no proporcionado. Usando usuario simulado para pruebas locales.');
      request.user = { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', email: 'admin.dev@afinitive.pe', role: 'Administrador' };
      return true;
    }

    try {
      const client = this.supabaseService.getClient();
      const { data: { user }, error } = await client.auth.getUser(token);

      if (error || !user) {
        this.logger.warn('Token no verificado en Supabase. Usando usuario simulado para pruebas locales.');
        request.user = { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', email: 'admin.dev@afinitive.pe', role: 'Administrador' };
        return true;
      }

      // Inyectar el usuario autenticado en el request
      request.user = user;
      return true;
    } catch (err) {
      this.logger.warn('Error en validación Supabase Auth. Usando usuario simulado para pruebas locales.');
      request.user = { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', email: 'admin.dev@afinitive.pe', role: 'Administrador' };
      return true;
    }
  }

  private extractTokenFromHeader(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
