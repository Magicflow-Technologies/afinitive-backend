import { BusinessRule } from '../business-rule.interface';
import { UserValidationContext } from './min-age.rule';

export class NoDisposableEmailRule implements BusinessRule<UserValidationContext> {
  name = 'NoDisposableEmailRule';
  errorMessage = 'No se permiten correos electrónicos temporales o desechables.';

  private readonly disposableDomains = ['mailinator.com', 'yopmail.com', 'tempmail.com'];

  validate(context: UserValidationContext): boolean {
    if (!context.email || !context.email.includes('@')) {
      return false;
    }
    const domain = context.email.split('@')[1].toLowerCase();
    return !this.disposableDomains.includes(domain);
  }
}
