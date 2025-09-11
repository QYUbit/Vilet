import { isRef } from "./reactivity"

export function isObject(value: any) {
    return typeof value === "object" && value !== null
}

export function isFunction(value: any): value is Function {
    return typeof value === "function"
}

export function getReactiveValue(value: any) {
    if (isRef(value)) {
        return value.value
    }
    if (isFunction(value)) {
        return value()
    }
    return value
}