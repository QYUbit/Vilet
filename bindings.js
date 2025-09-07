import { registerBinding } from "./bind"
import { effect } from "./reactivity"

export function initBindings() {
    registerBinding("$text", (el, ctx, bind) => {
        effect(() => {
            const val = ensureValue(bind, ctx, el)
            if (el.textContent !== String(val)) {
                el.textContent = String(val)
            }
        })
    })

    registerBinding("$show", (el, ctx, bind) => {
        effect(() => {
            const shouldShow = ensureValue(bind, ctx, el)
            el.style.display = shouldShow ? "block" : "none"
        })
    })

    registerBinding("$class", bindClass)
    registerBinding("$style", bindStyle)

    registerBinding("$model", (el, ctx, bind) => {
        if (typeof bind === "string") {
            return bindModel(el, ctx, bind) 
        } else {
            return bindValidationModel(el, ctx, bind)
        }
    })

    registerBinding("$template", (el, ctx, bind) => {
        let templateCleanup = null
                
        return effect(() => {
            if (templateCleanup) templateCleanup()
            el.innerHTML = ""

            const ref = ensureValue(bind, ctx, el)
            ref.init()
            ref.mount(el)
            templateCleanup = ref.destroy
        })
    })

    registerBinding("$for", bindFor)
    registerBinding("$each", () => {})
    registerBinding("$key", () => {})
}

function bindClass(el, context, bind) {
    if (!el._originalClasses) {
        el._originalClasses = new Set(el.classList)
    }
    
    return effect(() => {
        const dynamicClasses = ensureValue(bind, context)
        
        if (el._viletClasses) {
            el._viletClasses.forEach(cls => el.classList.remove(cls))
        }
        
        const newClasses = new Set()
        
        if (typeof dynamicClasses === "string") {
            dynamicClasses.split(/\s+/).forEach(cls => {
                if (cls) newClasses.add(cls)
            })
        } else if (typeof dynamicClasses === "object") {
            Object.entries(dynamicClasses).forEach(([className, condition]) => {
                if (ensureValue(condition, context)) {
                    newClasses.add(className)
                }
            })
        } else if (Array.isArray(dynamicClasses)) {
            dynamicClasses.forEach(cls => {
                if (typeof cls === "string") {
                    newClasses.add(cls)
                } else if (typeof cls === "object") {
                    Object.entries(cls).forEach(([className, condition]) => {
                        if (ensureValue(condition, context)) {
                            newClasses.add(className)
                        }
                    })
                }
            })
        }
        
        newClasses.forEach(cls => el.classList.add(cls))
        
        el._viletClasses = newClasses
    })
}

function bindStyle(el, context, bind) {
    if (!el._originalStyle) {
        el._originalStyle = el.getAttribute("style") || ""
    }
    
    return effect(() => {
        const dynamicStyles = ensureValue(bind, context)
        
        if (el._viletStyles) {
            Object.keys(el._viletStyles).forEach(prop => {
                el.style.removeProperty(prop)
            })
        }
        
        if (el._originalStyle) {
            el.setAttribute("style", el._originalStyle)
        } else {
            el.removeAttribute("style")
        }
        
        const newStyles = {}
        
        if (typeof dynamicStyles === "object") {
            Object.entries(dynamicStyles).forEach(([property, bind]) => {
                const finalValue = ensureValue(bind, context)
                if (finalValue != null) {
                    const cssProperty = property.replace(/([A-Z])/g, "-$1").toLowerCase()
                    el.style.setProperty(cssProperty, String(finalValue))
                    newStyles[cssProperty] = finalValue
                }
            })
        }
        
        el._viletStyles = newStyles
    })
}

function bindModel(el, context, ctxRef) {
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

function bindValidationModel(el, context, modelConfig) {
    const { path, validate, transform } = modelConfig
    const parts = path.split(".")
    
    // Context -> DOM
    effect(() => {
        const currentValue = getNestedValue(context, parts)
        el.value = String(currentValue || "")
        
        el.classList.remove("valid", "invalid")
        if (currentValue && validate) {
            el.classList.add(validate(currentValue) ? "valid" : "invalid")
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
            el.classList.remove("invalid")
            el.classList.add("valid")
        } else {
            setNestedValue(context, parts, value)
            el.classList.remove("valid")
            el.classList.add("invalid")
        }
    }
    
    el.addEventListener("input", domEvent)
    el.addEventListener("blur", domEvent)
    
    return () => {
        el.removeEventListener("input", domEvent)
        el.removeEventListener("blur", domEvent)
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

function bindFor(el, context, bind, props) {
    let templates = {}
    let itemKeyMap = new WeakMap()
    let keyCounter = 0

    return effect(() => {
        // Generate keys for new array
        const arr = ensureValue(bind, context)
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
    return typeof value === "function" ? value(...args) : value
}
