import { registerBinding } from "./bind"
import { effect } from "./reactivity"
import { getReactiveValue } from "./utils"

export function initBindings() {
    registerBinding("$text", bindText)
    registerBinding("$show", bindShow)
    registerBinding("$class", bindClass)
    registerBinding("$style", bindStyle)
    registerBinding("$for", bindFor)
    registerBinding("$each", () => {})
    registerBinding("$key", () => {})
}

function bindText(el: HTMLElement, value: any) {
    effect(() => {
        const val = getReactiveValue(value)
        if (el.textContent !== String(val)) {
            el.textContent = String(val)
        }
    })
}

interface ShowElement extends HTMLElement {
    _shouldShow: boolean
}

function bindShow(el: HTMLElement, value: any) {
    effect(() => {
        let shouldShow, delay = 0;
        if (typeof value === "object" && value !== null && "value" in value) {
            shouldShow = getReactiveValue(value.value);
            delay = value.hideDelay || 0;
        } else {
            shouldShow = getReactiveValue(value);
        }

        if ((el as ShowElement)._shouldShow === shouldShow) return

        if (!shouldShow && delay > 0) {
            (el as ShowElement)._shouldShow = false
            setTimeout(() => {
                el.style.display = "none"
            }, delay)
        } else {
            (el as ShowElement)._shouldShow = shouldShow
            el.style.display = shouldShow? "block": "none"
        }
        })
}

interface ClassElement extends HTMLElement {
    _originalClasses: Set<DOMTokenList>
    _viletClasses: Set<DOMTokenList>
}

function bindClass(element: HTMLElement, value: any) {
    const el = element as ClassElement

    if (!el._originalClasses) {
        const set = new Set<DOMTokenList>()
        el._originalClasses = set.add(el.classList)
    }
    
    return effect(() => {
        const dynamicClasses = getReactiveValue(value)
        
        if (el._viletClasses) {
            el._viletClasses.forEach(cls => el.classList.remove(cls.toString()))
        }
        
        const newClasses = new Set<DOMTokenList>()
        
        if (typeof dynamicClasses === "string") {
            dynamicClasses.split(/\s+/).forEach((cls) => {
                if (cls) newClasses.add(stringToDOMTokenList(cls))
            })
        } else if (typeof dynamicClasses === "object") {
            Object.entries(dynamicClasses).forEach(([className, condition]) => {
                if (getReactiveValue(condition)) {
                    newClasses.add(stringToDOMTokenList(className))
                }
            })
        } else if (Array.isArray(dynamicClasses)) {
            dynamicClasses.forEach((cls) => {
                if (typeof cls === "string") {
                    newClasses.add(stringToDOMTokenList(cls))
                } else if (typeof cls === "object") {
                    Object.entries(cls).forEach(([className, condition]) => {
                        if (getReactiveValue(condition)) {
                            newClasses.add(stringToDOMTokenList(className))
                        }
                    })
                }
            })
        }
        
        newClasses.forEach(cls => el.classList.add(cls.toString()))
        
        el._viletClasses = newClasses
    })
}

function stringToDOMTokenList(str: string): DOMTokenList {
    const el = document.createElement('div');
    el.className = str;
    return el.classList;
}

interface StyleElement extends HTMLElement {
    _originalStyle: string
    _viletStyles: string | Record<string, any>
}

function bindStyle(element: HTMLElement, value: any) {
    const el = element as StyleElement

    if (!el._originalStyle) {
        el._originalStyle = el.getAttribute("style") || ""
    }
    
    return effect(() => {
        const dynamicStyles = getReactiveValue(value)
        
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
        
        const newStyles: Record<string, any> = {}
        
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
                const finalValue = getReactiveValue(bind)
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

function parseCssString(cssString: string, styles: Record<string, any>) {
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

interface Mounter {
    mount(el: HTMLElement): void
    unmount(el: HTMLElement): void
    elements: ChildNode[]
}

function bindFor(el: HTMLElement, value: any, props: Record<string, any>) {
    let templates: Record<string, Mounter> = {}
    let itemKeyMap = new WeakMap()
    let keyCounter = 0

    return effect(() => {
        // Generate keys for new array
        const arr = getReactiveValue(value)
        if (!Array.isArray(arr)) return

        const newKeys = arr.map((item, i) => {
            if (props.$key) {
                return props.$key(item, i)
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
        
        keysToRemove.forEach((key) => {
            templates[key].unmount(el)
            delete templates[key]
        })

        // Generate new templates for new keys
        newKeys.forEach((key, i) => {
            if (!templates[key]) {
                const ref = props.$each(arr[i], i)
                ref.mount(el)
                templates[key] = ref
            }
        })

        // Ensure elements are in right order
        newKeys.forEach((key, index) => {
            const template = templates[key]

            if (template && template.elements && template.elements.length > 0) {
                const firstElement = template.elements[0]
                const targetPosition = index
                const currentPosition = Array.from(el.children).indexOf(firstElement as Element)
                
                if (currentPosition !== targetPosition && currentPosition !== -1) {
                    template.elements.forEach(element => {
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
