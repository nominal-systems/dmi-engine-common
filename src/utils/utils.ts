export function objectOrArray<T> (obj: T | T[]): T[] {
  return Array.isArray(obj) ? obj : [obj]
}

export function isNullOrUndefinedOrEmpty (value: any): boolean {
  return value === undefined || value === null || value === ''
}
