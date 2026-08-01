export class BusinessRuleViolationException extends Error {
  constructor(public readonly ruleName: string, message: string) {
    super(message);
    this.name = 'BusinessRuleViolationException';
  }
}
