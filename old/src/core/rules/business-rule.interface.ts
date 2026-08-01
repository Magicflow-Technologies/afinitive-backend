export interface BusinessRule<T = any> {
  name: string;
  errorMessage: string;
  validate(context: T): Promise<boolean> | boolean;
}
