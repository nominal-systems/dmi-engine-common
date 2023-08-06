export enum TestResultStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  COMPLETED = 'COMPLETED',
  REVISED = 'REVISED',
  CANCELLED = 'CANCELLED'
}

export enum TestResultItemStatus {
  PENDING = 'PENDING',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED'
}

export enum TestResultItemInterpretationCode {
  NORMAL = 'N',
  ABNORMAL = 'A',
  CRITICAL_LOW = 'LL',
  PROBABLE_LOW = 'PL',
  LOW = 'L',
  HIGH = 'H',
  PROBABLE_HIGH = 'PH',
  CRITICAL_HIGH = 'HH'
}
