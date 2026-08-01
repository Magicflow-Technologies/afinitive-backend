import { BusinessRule } from '../business-rule.interface';

export interface UserValidationContext {
  email: string;
  birthDate: Date;
}

export class MinAgeRule implements BusinessRule<UserValidationContext> {
  name = 'MinAgeRule';
  errorMessage = 'El usuario debe ser mayor de 18 años.';

  constructor(private readonly minAge: number = 18) {}

  validate(context: UserValidationContext): boolean {
    const today = new Date();
    const birthDate = new Date(context.birthDate);
    
    // Verificar si la fecha es válida
    if (isNaN(birthDate.getTime())) {
      return false;
    }

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age >= this.minAge;
  }
}
