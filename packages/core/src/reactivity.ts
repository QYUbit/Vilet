import { log } from "./log.js"
import { scheduler } from "./scheduler.js"
import { Ref } from "./types.js"

type Key = string | symbol
type Dep = Set<EffectFunc>

interface EffectFunc extends Function {
    deps: Set<Dep>
}

const arrayMethods: Key[] = ["push", "pop", "shift", "unshift", "splice", "sort", "reverse"]

let currentEffect: EffectFunc | null = null
let targetMap = new WeakMap<object, Map<Key, Dep>>()


function track(target: object, key: Key) {
    if (!currentEffect) return
    
    log(`Tracking key "${String(key)}"`)

    let depsMap = targetMap.get(target)
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }
    
    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, (dep = new Set()))
    }
    
    dep.add(currentEffect)
    currentEffect.deps.add(dep)
}

function trigger(target: object, key: Key) {
    const depsMap = targetMap.get(target)
    if (!depsMap) return

    log(`Trigering dependencies of key "${String(key)}"`)
    
    const dep = depsMap.get(key)
    if (dep) {
        dep.forEach(effect => scheduler(effect))
    }
}

/**
 * Returns a reactive proxy of target. Effective functions can react when this proxy is modified.
 */
export function reactive<T extends object>(target: T): T {
    if (typeof target !== "object" || target === null) {
        return target
    }

    if ((target as any).__isReactive) {
        return target
    }

    return new Proxy(target, {
        get(target, key, receiver) {
            if (key === "__isReactive") {
                return true
            }

            const result = Reflect.get(target, key, receiver)

            if (!(Array.isArray(target) && arrayMethods.includes(key))) {
                track(target, key)
            }

            if (Array.isArray(target) && arrayMethods.includes(key)) {
                return (...args: any) => {
                    const oldLength = target.length
                    const _result = (result as any).apply(target, args)
                    
                    if (target.length !== oldLength) {
                        trigger(target, "length")
                    }
                    
                    trigger(target, key)
                    
                    return _result
                }
            }
            
            if (typeof result === "object" && result !== null) {
                return reactive(result)
            }
            
            return result
        },
        set(target, key, value, receiver) {
            const oldValue = Reflect.get(target, key, receiver)
            const result = Reflect.set(target, key, value, receiver)
            
            if (value !== oldValue) {
                trigger(target, key)
                
                if (Array.isArray(target) && key !== "length" && !isNaN(Number(key))) {
                    const index = Number(key)
                    if (index >= target.length - 1) {
                        trigger(target, "length")
                    }
                }
            }
            
            return result
        },
        deleteProperty(target, key) {
            const result = Reflect.deleteProperty(target, key)
            trigger(target, key)
            return result
        }
    })
}

/**
 * Executes fn each time a reactive dependency changes.
 * Returns a callback to stop listening to changes.
 */
export function effect(fn: () => void) {
    const effectFunc: EffectFunc = () => {
        const newDeps = new Set<Dep>()
        const oldDeps = effectFunc.deps
        effectFunc.deps = newDeps
                
        const prevEffect = currentEffect
        currentEffect = effectFunc
        try {
            fn()
        } finally {
            currentEffect = prevEffect
        }
        
        oldDeps.forEach(dep => {
            if (!effectFunc.deps.has(dep)) {
                dep.delete(effectFunc)
            }
        })
    }

    effectFunc.deps = new Set()

    effectFunc()

    return () => {
        effectFunc.deps.forEach((dep) => dep.delete(effectFunc))
        effectFunc.deps.clear()
    }
}

/**
 * Creates a reactive reference to a value. The ref's value can be accessed and modified
 * via the .value property.
 */
export function ref<T>(value: T): Ref<T> {
    if (isRef(value)) {
        return value as Ref<T>
    }

    const refImpl = {
        __isRef: true as const,
        _value: value,
        get value() {
            track(refImpl, 'value')
            return this._value
        },
        set value(newValue: T) {
            if (newValue !== this._value) {
                if (Array.isArray(newValue)) {
                    const reactiveArray = reactive([...newValue])
                    
                    this._value = new Proxy(reactiveArray, {
                        get(target, key, receiver) {
                            const result = Reflect.get(target, key, receiver)
                            
                            if (typeof result === 'function' && arrayMethods.includes(key as string)) {
                                return function(this: any, ...args: any[]) {
                                    const res = result.apply(this, args)
                                    trigger(refImpl, 'value')
                                    return res
                                }
                            }
                            
                            return result
                        },
                        set(target, key, newVal, receiver) {
                            const result = Reflect.set(target, key, newVal, receiver)
                            if (!isNaN(Number(key))) {
                                trigger(refImpl, 'value')
                            }
                            return result
                        }
                    }) as any
                } else {
                    this._value = newValue
                }
                trigger(refImpl, 'value')
            }
        }
    }

    if (Array.isArray(value)) {
        const reactiveArray = reactive([...value])
        
        refImpl._value = new Proxy(reactiveArray, {
            get(target, key, receiver) {
                const result = Reflect.get(target, key, receiver)
                
                if (typeof result === 'function' && arrayMethods.includes(key as string)) {
                    return function(this: any, ...args: any[]) {
                        const res = result.apply(this, args)
                        trigger(refImpl, 'value')
                        return res
                    }
                }
                
                return result
            },
            set(target, key, newValue, receiver) {
                const result = Reflect.set(target, key, newValue, receiver)
                
                if (!isNaN(Number(key))) {
                    trigger(refImpl, 'value')
                }
                
                return result
            }
        }) as any
    } else if (typeof value === 'object' && value !== null) {
        refImpl._value = reactive(value)
    }

    return refImpl as Ref<T>
}

/**
 * Checks if a value is reactive
 */
export function isReactive(value: any) {
    return !!(value && value.__isReactive === true)
}

/**
 * Checks if a value is a ref
 */
export function isRef<T>(value: any): value is Ref<T> {
    return !!(value && value.__isRef === true)
}

/**
 * Returns the inner value if the argument is a ref, otherwise returns the argument as-is.
 */
export function unref<T>(value: T | Ref<T>): T {
    return isRef(value) ? value.value : value
}

/**
 * Converts a ref to a reactive object or returns the value as-is if it's not a ref.
 */
export function toReactive<T extends object>(value: T | Ref<T>): T {
    return reactive(unref(value))
}
