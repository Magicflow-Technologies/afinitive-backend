import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { RulesEngineService } from '../rules-engine/rules-engine.service';
import { SupabaseService } from '../supabase/supabase.service';
import { MinAgeRule, UserValidationContext } from '../../core/rules/users/min-age.rule';
import { NoDisposableEmailRule } from '../../core/rules/users/no-disposable-email.rule';
import { BusinessRuleViolationException } from '../../core/exceptions/business-rule-violation.exception';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly rulesEngine: RulesEngineService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async createUser(data: { email: string; birthDate: string }) {
    const context: UserValidationContext = {
      email: data.email,
      birthDate: new Date(data.birthDate),
    };

    // 1. Definir las reglas de negocio a aplicar para este caso de uso
    const rules = [
      new MinAgeRule(18),
      new NoDisposableEmailRule(),
    ];

    try {
      // 2. Orquestar y validar las reglas de negocio (El cerebro) antes de tocar la base de datos
      await this.rulesEngine.validate(rules, context);

      this.logger.log(`Reglas validadas con éxito para ${data.email}. Procediendo con la base de datos...`);

      // 3. Intentar interactuar con Supabase
      let supabaseClient;
      try {
        supabaseClient = this.supabaseService.getClient();
      } catch (err) {
        this.logger.warn('Cliente Supabase no inicializado. Simulando persistencia en base de datos...');
        return {
          success: true,
          message: 'Usuario validado con éxito. (Persistencia simulada: configure las credenciales de Supabase para guardar realmente).',
          data: {
            email: data.email,
            birthDate: data.birthDate,
            persisted: false,
          },
        };
      }

      // Ejemplo de inserción en Supabase
      const { data: user, error } = await supabaseClient
        .from('users')
        .insert([{ email: data.email, birth_date: data.birthDate }])
        .select()
        .single();

      if (error) {
        this.logger.error('Error al insertar en Supabase:', error);
        throw new HttpException(`Error en base de datos: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return {
        success: true,
        message: 'Usuario creado exitosamente en la base de datos.',
        data: user,
      };

    } catch (error) {
      if (error instanceof BusinessRuleViolationException) {
        // Retornar error controlado del negocio (400 Bad Request)
        throw new HttpException({
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Business Rule Violation',
          message: error.message,
          rule: error.ruleName,
        }, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }
}
