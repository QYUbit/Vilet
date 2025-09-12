import { isRef } from "./reactivity"
import { ReactiveValue } from "./types"

export function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null
}

export function isFunction(value: unknown): value is Function {
  return typeof value === "function"
}

export function getReactiveValue<T>(value: ReactiveValue<T>): T {
  if (isRef<T>(value)) {
    return value.value
  }
  if (isFunction(value)) {
    return value()
  }
  return value as T
}