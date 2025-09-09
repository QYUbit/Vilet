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
            dynamicClasses.split(/\s+/).forEach((cls) => {
                if (cls) newClasses.add(cls)
            })
        } else if (typeof dynamicClasses === "object") {
            Object.entries(dynamicClasses).forEach(([className, condition]) => {
                if (ensureValue(condition, context)) {
                    newClasses.add(className)
                }
            })
        } else if (Array.isArray(dynamicClasses)) {
            dynamicClasses.forEach((cls) => {
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
            Object.keys(el._viletStyles).forEach((prop) => {
                el.style.removeProperty(prop)
            })
        }
        
        if (el._originalStyle) {
            el.setAttribute("style", el._originalStyle)
        } else {
            el.removeAttribute("style")
        }
        
        const newStyles = {}
        
        if (typeof dynamicStyles === "string") {
            const cssString = dynamicStyles.trim()
            if (cssString) {
                const currentStyle = el.getAttribute("style") || ""
                const separator = currentStyle && !currentStyle.endsWith(";") ? "; " : ""
                const finalCssString = cssString.endsWith(";") ? cssString : cssString + ";"
                el.setAttribute("style", currentStyle + separator + finalCssString)
                
                parseCssString(finalCssString, newStyles)
            }
        } else if (typeof dynamicStyles === "object") {
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

function parseCssString(cssString, styles) {
    const rules = cssString.split(';').filter(rule => rule.trim())
    
    rules.forEach(rule => {
        const colonIndex = rule.indexOf(':')
        if (colonIndex > 0) {
            const property = rule.substring(0, colonIndex).trim()
            const value = rule.substring(colonIndex + 1).trim()
            if (property && value) {
                styles[property] = value
            }
        }
    })
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
