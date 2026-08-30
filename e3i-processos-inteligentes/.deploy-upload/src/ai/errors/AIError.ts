export class AIError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string = 'AI_ERROR', details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
