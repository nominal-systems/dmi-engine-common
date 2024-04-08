export function mergePicks<T, K1 extends keyof T, K2 extends keyof T> (
  obj1: Pick<T, K1>,
  obj2: Pick<T, K2>
): T {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return { ...obj1, ...obj2 } as T
}
