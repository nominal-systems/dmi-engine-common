export function isNumber (str: string): boolean {
  if (str === null || str === undefined) {
    return false
  } else {
    return !isNaN(parseFloat(str)) && isFinite(Number(str))
  }
}
