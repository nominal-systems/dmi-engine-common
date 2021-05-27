export type RequiredKeys<T> = {
  [K in keyof T]-?: Record<string, unknown> extends { [P in K]: T[K] }
    ? never
    : K
}[keyof T]

export type OptionalKeys<T> = {
  [K in keyof T]-?: Record<string, unknown> extends { [P in K]: T[K] }
    ? K
    : never
}[keyof T]

export type PickRequired<T> = Pick<T, RequiredKeys<T>>

export type PickOptional<T> = Pick<T, OptionalKeys<T>>

export type Nullable<T> = { [P in keyof T]: T[P] | null }

export type NullableOptional<T> = PickRequired<T> & Nullable<PickOptional<T>>

export type NonNullableOptional<T> = PickRequired<T> &
  NonNullable<PickOptional<T>>
