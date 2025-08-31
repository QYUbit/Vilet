// Globaler State für Dependency Tracking
let currentEffect = null
const targetMap = new WeakMap()

/**
 * Dependency Tracking System
 * Verfolgt welche Effects von welchen Properties abhängen
 */
function track(target, key) {
    if (!currentEffect) return
    
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }
    
    let deps = depsMap.get(key)
    if (!deps) {
        depsMap.set(key, (deps = new Set()))
    }
    
    deps.add(currentEffect)
    currentEffect.deps.add(deps)
}

/**
 * Trigger System
 * Führt alle Effects aus, die von einer Property abhängen
 */
function trigger(target, key) {
    const depsMap = targetMap.get(target)
    if (!depsMap) return
    
    const effects = depsMap.get(key)
    if (!effects) return
    
    // Kopiere Set um Modifikation während Iteration zu vermeiden
    const effectsToRun = new Set(effects)
    effectsToRun.forEach(effect => {
        if (effect.scheduler) {
            effect.scheduler()
        } else {
            effect.run()
        }
    })
}

/**
 * Reactive Proxy Factory
 * Erstellt reactive Objekte mit automatischem Dependency Tracking
 */
export function reactive(target) {
    if (target.__isReactive) {
        return target
    }
    
    return new Proxy(target, {
        get(target, key, receiver) {
            // Spezielle Marker für reactive Objects
            if (key === '__isReactive') {
                return true
            }
            
            const result = Reflect.get(target, key, receiver)
            
            // Track dependency für diesen Key
            track(target, key)
            
            // Nested Objects auch reactive machen
            if (isObject(result)) {
                return reactive(result)
            }
            
            return result
        },
        
        set(target, key, value, receiver) {
            const oldValue = target[key]
            const result = Reflect.set(target, key, value, receiver)
            
            // Trigger nur wenn sich Wert geändert hat
            if (oldValue !== value) {
                trigger(target, key)
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
 * Effect System
 * Führt Funktionen aus und trackt ihre Dependencies automatisch
 */
class ReactiveEffect {
    constructor(fn, scheduler = null) {
        this.fn = fn
        this.scheduler = scheduler
        this.deps = new Set()
        this.active = true
    }
    
    run() {
        if (!this.active) return
        
        let parent

        try {
            // Cleanup alte Dependencies
            this.cleanup()
            
            // Setze als aktuell laufenden Effect
            parent = currentEffect
            currentEffect = this
            
            // Führe Funktion aus (sammelt Dependencies automatisch)
            return this.fn()
        } finally {
            currentEffect = parent
        }
    }
    
    cleanup() {
        this.deps.forEach(dep => {
            dep.delete(this)
        })
        this.deps.clear()
    }
    
    stop() {
        if (this.active) {
            this.cleanup()
            this.active = false
        }
    }
}

/**
 * Effect Function
 * Public API für das Erstellen von Effects
 */
export function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler)
    
    // Führe sofort aus
    _effect.run()
    
    // Return Funktion zum manuellen Stoppen
    return () => _effect.stop()
}

/**
 * Computed Values
 * Cached reactive computations
 */
export function computed(getter) {
    let value
    let dirty = true
    
    const runner = new ReactiveEffect(getter, () => {
        // Scheduler: markiere als dirty wenn Dependencies sich ändern
        dirty = true
        trigger(computed, 'value')
    })
    
    return new Proxy({}, {
        get(target, key) {
            if (key === 'value') {
                if (dirty) {
                    value = runner.run()
                    dirty = false
                }
                track(computed, 'value')
                return value
            }
        }
    })
}

/**
 * Watch Function
 * Überwacht specific Properties und reagiert auf Änderungen
 */
export function watch(source, callback, options = {}) {
    let oldValue
    let getter
    
    if (typeof source === 'function') {
        getter = source
    } else {
        getter = () => source
    }
    
    if (options.immediate) {
        oldValue = getter()
    }
    
    return effect(() => {
        const newValue = getter()
        
        if (oldValue !== newValue || options.deep) {
            callback(newValue, oldValue)
            oldValue = newValue
        }
    })
}

function isObject(val) {
    return val !== null && typeof val === 'object'
}