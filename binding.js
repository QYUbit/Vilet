import { effect } from "./reactivity"

export function bindElements(config, root, context) {
    const cleanupFns = []

    for (const [key, value] of Object.entries(config)) {
        if (key === "$" || key === "$selector" || key.startsWith("_")) continue
        if (!isObject(value) || (!value.selector && !value.$ && !value.$el && !interpretAsQuery(key))) continue

        let el
        if (value.$el) {
            el = value.$el
        } else if (interpretAsQuery(key)) {
            el = root.querySelector(key)
        } else {
            el = root.querySelector(value.$selector ?? value.$)
        }

        for (const prop in value) {
            const cleanup = bindProp(el, value, prop, context)
            if (isFunction(cleanup)) cleanupFns.push(cleanup)
        }
    }

    return cleanupFns
}

export function bindProp(el, props, key, context) {
    const value = props[key]

    switch (key) {
        case "$text":
            return effect(() => {
                const val = ensureValue(value, context, el)
                if (el.textContent !== String(val)) {
                    el.textContent = String(val)
                }
            })
        case "$show":
            return effect(() => {
                const shouldShow = ensureValue(value, context, el)
                el.style.display = shouldShow ? "block" : "none"
            })
        case "$model":
            if (typeof value === "string") {
                return bindModel(el, value, context) 
            } else {
                return bindValidationModel(el, value, context)
            }

        case "$for":
            return bindFor(el, props, value, context)

        case "$each":
        case "$key":
            break
        case "$template":
            let templateCleanup = null
            
            return effect(() => {
                if (templateCleanup) templateCleanup()
                el.innerHTML = ""

                const ref = ensureValue(value, context, el)
                ref.init()
                ref.mount(el)
                templateCleanup = ref.destroy
            })
        default:
            if (key.startsWith("on") && isFunction(value)) {
                el.addEventListener(key.slice(2).toLowerCase(), e => value(context, e, el))
                return () => el.removeEventListener(key.slice(2).toLowerCase(), value)
            }

            if (!key.startsWith("_")) {
                return effect(() => {
                    const val = ensureValue(value, context, el)
                    if (el[key] !== val) el[key] = val
                })
            }
    }
}

function bindModel(el, ctxRef, context) {
    const path = typeof ctxRef === "string" ? ctxRef.split(".") : [ctxRef]
    
    // Context -> DOM
    const ctxChange = effect(() => {
        const currentValue = getNestedValue(context, path)
        
        if (el.type === "checkbox") {
            if (el.checked !== currentValue) {
                el.checked = !!currentValue
            }
        } else if (el.type === "radio") {
            if (el.checked !== (el.value === String(currentValue))) {
                el.checked = el.value === String(currentValue)
            }
        } else {
            if (el.value !== String(currentValue || "")) {
                el.value = String(currentValue || "")
            }
        }
    })
    
    // DOM -> Context
    const eventType = getModelEventType(el)
    const domChange = () => {
        let newValue
        
        if (el.type === "checkbox") {
            newValue = el.checked
        } else if (el.type === "radio") {
            newValue = el.value
        } else if (el.type === "number" || el.type === "range") {
            newValue = el.valueAsNumber
        } else {
            newValue = el.value
        }
        
        setNestedValue(context, path, newValue)
    }
    
    el.addEventListener(eventType, domChange)
    
    return () => {
        el.removeEventListener(eventType, domChange)
        if (typeof ctxChange === "function") ctxChange()
    }
}

function bindValidationModel(el, modelConfig, context) {
    const { path, validate, transform } = modelConfig
    const parts = path.split('.')
    
    // Context -> DOM
    effect(() => {
        const currentValue = getNestedValue(context, parts)
        el.value = String(currentValue || '')
        
        el.classList.remove('valid', 'invalid')
        if (currentValue && validate) {
            el.classList.add(validate(currentValue) ? 'valid' : 'invalid')
        }
    })
    
    // DOM -> Context
    const domEvent = () => {
        let value = el.value
        
        if (transform) {
            value = transform(value)
        }
        
        if (!validate || validate(value)) {
            setNestedValue(context, parts, value)
            el.classList.remove('invalid')
            el.classList.add('valid')
        } else {
            setNestedValue(context, parts, value)
            el.classList.remove('valid')
            el.classList.add('invalid')
        }
    }
    
    el.addEventListener('input', domEvent)
    el.addEventListener('blur', domEvent)
    
    return () => {
        el.removeEventListener('input', domEvent)
        el.removeEventListener('blur', domEvent)
    }
}

function getNestedValue(obj, path) {
    return path.reduce((current, key) => current?.[key], obj)
}

function setNestedValue(obj, path, value) {
    const pathCopy = [...path]
    const lastKey = pathCopy.pop()
    const target = pathCopy.reduce((current, key) => {
        if (!current[key]) current[key] = {}
        return current[key]
    }, obj)
    target[lastKey] = value
}

function getModelEventType(el) {
    const tag = el.tagName.toLowerCase()
    const type = el.type?.toLowerCase()
    
    if (type === "checkbox" || type === "radio") {
        return "change"
    } else if (tag === "select") {
        return "change"
    } else {
        return "input"
    }
}


function bindFor(el, props, value, context) {
    let templates = {}
    let itemKeyMap = new WeakMap()
    let keyCounter = 0

    return effect(() => {
        // Generate keys for new array
        const arr = ensureValue(value, context)
        const newKeys = arr.map((item, i) => {
            if (props.$key) {
                return ensureValue(props.$key, context, item, i, el)
            }
            
            if (typeof item === "object" && item !== null) {
                if (!itemKeyMap.has(item)) {
                    itemKeyMap.set(item, `obj_${keyCounter++}`)
                }
                return itemKeyMap.get(item)
            } else {
                return `${item}_${i}`
            }
        })

        // Filter out and delete templates that are no longer needed
        const existingKeys = Object.keys(templates)
        const keysToRemove = existingKeys.filter(key => !newKeys.includes(key))
        
        keysToRemove.forEach(key => {
            templates[key].unmount(el)
            templates[key].destroy()
            delete templates[key]
        })

        // Generate new templates for new keys
        newKeys.forEach((key, i) => {
            if (!templates[key]) {
                const ref = ensureValue(props.$each, context, arr[i], i)
                ref.init()
                ref.mount(el)
                templates[key] = ref
            }
        })

        // Ensure elements are in right order
        newKeys.forEach((key, index) => {
            const template = templates[key]
            if (template && template.mounted && template.mounted.length > 0) {
                const firstElement = template.mounted[0]
                const targetPosition = index
                const currentPosition = Array.from(el.children).indexOf(firstElement)
                
                if (currentPosition !== targetPosition && currentPosition !== -1) {
                    template.mounted.forEach(element => {
                        if (targetPosition >= el.children.length) {
                            el.appendChild(element)
                        } else {
                            el.insertBefore(element, el.children[targetPosition])
                        }
                    })
                }
            }
        })
    })
}

function ensureValue(value, ...args) {
    return isFunction(value) ? value(...args) : value
}

function interpretAsQuery(key) {
    return key.startsWith(".") || key.startsWith("#") || key.startsWith("[")
}

function isFunction(value) {
    return typeof value === "function"
}

function isObject(value) {
    return typeof value === "object" && value !== null
}
