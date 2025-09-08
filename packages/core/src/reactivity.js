import { scheduler } from "./scheduler.js"

let currentEffect = null
const targetMap = new WeakMap()

// Track which effect is currently running
function track(target, key) {
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
    
    // Track reverse dependency for cleanup
    if (!currentEffect.deps) {
        currentEffect.deps = new Set()
    }
    currentEffect.deps.add(dep)
}

// Trigger all effects that depend on this property
function trigger(target, key) {
    const depsMap = targetMap.get(target)
    if (!depsMap) return
    
    const dep = depsMap.get(key)
    if (dep) {
        dep.forEach(effect => effect())
    }
}

const arrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']

// Create a reactive proxy for objects and arrays
function reactive(target) {
    if (typeof target !== "object" || target === null) {
        return target
    }
    
    if (target.__isReactive) {
        return target
    }
    
    return new Proxy(target, {
        get(target, key, receiver) {
            if (key === "__isReactive") {
                return true
            }
            
            // For array methods, return wrapped version
            if (Array.isArray(target) && arrayMethods.includes(key)) {
                const originalMethod = target[key]
                return function(...args) {
                    const oldLength = target.length
                    const result = originalMethod.apply(target, args)
                    
                    // Only trigger length if it actually changed
                    if (target.length !== oldLength) {
                        trigger(target, "length")
                    }
                    
                    return result
                }
            }
            
            track(target, key)
            
            const result = Reflect.get(target, key, receiver)
            
            // Make nested objects reactive too
            if (typeof result === "object" && result !== null) {
                return reactive(result)
            }
            
            return result
        },
        
        set(target, key, value, receiver) {
            const oldValue = target[key]
            const result = Reflect.set(target, key, value, receiver)
            
            if (value !== oldValue) {
                trigger(target, key)
                
                // Only trigger length when adding a new index
                if (Array.isArray(target) && key !== "length" && !isNaN(key)) {
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

// Clean up effect dependencies
function cleanup(effect) {
    if (effect.deps) {
        effect.deps.forEach(dep => {
            dep.delete(effect)
        })
        effect.deps.clear()
    }
}

// Run a function and track its dependencies
function effect(fn, schedule = true) {
    const effectFn = () => {
        const run = () => {
            cleanup(effectFn)
            const prevCurrentEffect = currentEffect
            currentEffect = effectFn
            try {
                fn()
            } finally {
                currentEffect = prevCurrentEffect
            }
        }

        if (schedule) {
            scheduler(run)
        } else {
            run()
        }
    }

    effectFn()

    return effectFn
}

// Create a computed value that updates when dependencies change
function computed(fn) {
    let value
    let dirty = true
    
    const computedRef = {
        get value() {
            if (dirty) {
                value = fn()
                dirty = false
            }
            track(computedRef, "value")
            return value
        }
    }
    
    // Create effect that marks computed as dirty when dependencies change
    effect(() => {
        fn()
        
        // Mark as dirty for next access
        if (!dirty) {
            dirty = true
            trigger(computedRef, "value")
        }
    })
    
    return computedRef
}

// Watch for changes to a specific value
function watch(getter, callback) {
    let oldValue
    let isFirst = true
    
    effect(() => {
        const newValue = getter()
        if (!isFirst && newValue !== oldValue) {
            callback(newValue, oldValue)
        }
        oldValue = newValue
        isFirst = false
    })
}

export { reactive, effect, computed, watch }
