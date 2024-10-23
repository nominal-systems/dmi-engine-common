export function objectOrArray<T> (obj: T | T[]): T[] {
  return Array.isArray(obj) ? obj : [obj]
}

export function isNullOrUndefinedOrEmpty (value: any): boolean {
  return value === undefined || value === null || value === ''
}

export function isNumber (str: string): boolean {
  if (str === null || str === undefined) {
    return false
  } else {
    return !isNaN(parseFloat(str)) && isFinite(Number(str))
  }
}
