export type AlarmFlowErrorCode =
  | 'UPLOAD_FAILED'
  | 'VALIDATION_FAILED'
  | 'BACKEND_FAILED'
  | 'CACHE_FAILED'
  | 'SCHEDULE_FAILED'
  | 'UNKNOWN';

export class AlarmFlowError extends Error {
  code: AlarmFlowErrorCode;
  details?: any;

  constructor(code: AlarmFlowErrorCode, message: string, details?: any) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
