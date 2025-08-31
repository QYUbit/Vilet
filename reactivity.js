let currentEffect = null;
const targetMap = new WeakMap();

// Track which effect is currently running
function track(target, key) {
    if (!currentEffect) return;
    
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()));
    }
    
    let dep = depsMap.get(key);
    if (!dep) {
        depsMap.set(key, (dep = new Set()));
    }
    
    dep.add(currentEffect);
}

// Trigger all effects that depend on this property
function trigger(target, key) {
    const depsMap = targetMap.get(target);
    if (!depsMap) return;
    
    const dep = depsMap.get(key);
    if (dep) {
        dep.forEach(effect => effect());
    }
}

// Create a reactive proxy for objects and arrays
function reactive(target) {
    if (typeof target !== "object" || target === null) {
        return target;
    }
    
    if (target.__isReactive) {
        return target;
    }
    
    return new Proxy(target, {
        get(target, key, receiver) {
            if (key === "__isReactive") {
                return true;
            }
            
            track(target, key);
            
            const result = Reflect.get(target, key, receiver);
            
            // Make nested objects reactive too
            if (typeof result === "object" && result !== null) {
                return reactive(result);
            }
            
            return result;
        },
        
        set(target, key, value, receiver) {
            const oldValue = target[key];
            const result = Reflect.set(target, key, value, receiver);
            
            if (value !== oldValue) {
                trigger(target, key);
                
                // For arrays, also trigger length changes
                if (Array.isArray(target) && key !== "length") {
                    trigger(target, "length");
                }
            }
            
            return result;
        },
        
        deleteProperty(target, key) {
            const result = Reflect.deleteProperty(target, key);
            trigger(target, key);
            return result;
        }
    });
}

// Run a function and track its dependencies
function effect(fn) {
    const effectFn = () => {
        const prevcurrentEffect = currentEffect;
        currentEffect = effectFn;
        try {
            fn();
        } finally {
            currentEffect = prevcurrentEffect;
        }
    };
    
    effectFn();
    
    return effectFn;
}

// Create a computed value that updates when dependencies change
function computed(fn) {
    let value;
    let dirty = true;
    
    const computedRef = {
        get value() {
            if (dirty) {
                value = fn();
                dirty = false;
            }
            track(computedRef, "value");
            return value;
        }
    };
    
    // Mark dirty when dependencies change
    effect(() => {
        const prevDirty = dirty;
        dirty = true;
        
        // If this is not the initial run, trigger dependents
        if (!prevDirty) {
            trigger(computedRef, "value");
        }
        
        // Access the function to track dependencies
        fn();
    });
    
    return computedRef;
}

// Watch for changes to a specific value
function watch(getter, callback) {
    let oldValue = getter();
    
    effect(() => {
        const newValue = getter();
        if (newValue !== oldValue) {
            callback(newValue, oldValue);
            oldValue = newValue;
        }
    });
}

export { reactive, effect, computed, watch };
