import { scheduler } from "./scheduler.js"

type Key = string | symbol
type Dep = Set<EffectFunc>

interface EffectFunc extends Function {
    deps: Set<Dep>
}

let currentEffect: EffectFunc | null = null
let targetMap = new WeakMap<object, Map<Key, Dep>>()


function track(target: object, key: Key) {
    if (!currentEffect) return
    
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
    
    const dep = depsMap.get(key)
    if (dep) {
        dep.forEach(effect => scheduler(() => effect()))
    }
}

const arrayMethods: Key[] = ["push", "pop", "shift", "unshift", "splice", "sort", "reverse"]

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

            console.log(`INTERNAL get key ${String(key)}`)
            track(target, key)

            if (Array.isArray(target) && arrayMethods.includes(key)) {
                return (...args: any) => {
                    const oldLength = target.length
                    const _result = (result as any).apply(target, args)
                    
                    if (target.length !== oldLength) {
                        trigger(target, "length")
                    }
                    
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

            console.log(`INTERNAL set key ${String(key)}`)
            
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
