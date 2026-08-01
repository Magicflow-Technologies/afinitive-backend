import { Injectable, Logger } from '@nestjs/common';
import { BusinessRule } from '../../core/rules/business-rule.interface';
import { BusinessRuleViolationException } from '../../core/exceptions/business-rule-violation.exception';

@Injectable()
export class RulesEngineService {
  private readonly logger = new Logger(RulesEngineService.name);

  /**
   * Valida un contexto contra una lista de reglas de negocio.
   * Si alguna regla falla, lanza una BusinessRuleViolationException.
   */
  async validate<T = any>(rules: BusinessRule<T>[], context: T): Promise<void> {
    this.logger.log(`Iniciando validación de ${rules.length} reglas de negocio...`);

    for (const rule of rules) {
      try {
        const isValid = await rule.validate(context);
        if (!isValid) {
          this.logger.warn(`Violación de regla de negocio: [${rule.name}] - ${rule.errorMessage}`);
          throw new BusinessRuleViolationException(rule.name, rule.errorMessage);
        }
      } catch (error) {
        if (error instanceof BusinessRuleViolationException) {
          throw error;
        }
        this.logger.error(`Error inesperado al validar la regla [${rule.name}]:`, error);
        throw new Error(`Error al validar la regla ${rule.name}: ${(error as Error).message}`);
      }
    }

    this.logger.log('Todas las reglas de negocio han sido validadas exitosamente.');
  }
}
