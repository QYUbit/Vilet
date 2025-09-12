import { registerBinding } from "./bind"
import { effect } from "./reactivity"
import { ClassValue, ElementConfig, ForConfig, ReactiveValue, ShowConfig, StyleValue, TemplateRef } from "./types"
import { getReactiveValue, isObject } from "./utils"

export function initBindings(): void {
  registerBinding<HTMLElement, ReactiveValue<string | number>>("$text", bindText)
  registerBinding<HTMLElement, ReactiveValue<boolean> | ShowConfig>("$show", bindShow)
  registerBinding<HTMLElement, ReactiveValue<ClassValue>>("$class", bindClass)
  registerBinding<HTMLElement, ReactiveValue<StyleValue>>("$style", bindStyle)
  registerBinding<HTMLElement, ReactiveValue<any[]>>("$for", bindFor)
  registerBinding("$each", () => {})
  registerBinding("$key", () => {})
}

function bindText(el: HTMLElement, value: ReactiveValue<string | number>): void {
  effect(() => {
    const val = getReactiveValue(value)
    const textContent = String(val)
    if (el.textContent !== textContent) {
      el.textContent = textContent
    }
  })
}

interface ShowElement extends HTMLElement {
  _shouldShow?: boolean
}

function bindShow(el: HTMLElement, value: ReactiveValue<boolean> | ShowConfig): void {
  effect(() => {
    let shouldShow: boolean
    let delay = 0
    
    if (isShowConfig(value)) {
      shouldShow = getReactiveValue(value.value)
      delay = value.hideDelay || 0
    } else {
      shouldShow = getReactiveValue(value)
    }

    const showEl = el as ShowElement
    if (showEl._shouldShow === shouldShow) return

    if (!shouldShow && delay > 0) {
      showEl._shouldShow = false
      setTimeout(() => {
        el.style.display = "none"
      }, delay)
    } else {
      showEl._shouldShow = shouldShow
      el.style.display = shouldShow ? "block" : "none"
    }
  })
}

function isShowConfig(value: any): value is ShowConfig {
  return typeof value === "object" && value !== null && "value" in value
}

interface ClassElement extends HTMLElement {
  _originalClasses?: Set<string>
  _viletClasses?: Set<string>
}

function bindClass(element: HTMLElement, value: ReactiveValue<ClassValue>): () => void {
  const el = element as ClassElement

  if (!el._originalClasses) {
    el._originalClasses = new Set(Array.from(el.classList))
  }
  
  return effect(() => {
    const dynamicClasses = getReactiveValue(value)
    
    // Entferne vorherige dynamische Klassen
    if (el._viletClasses) {
      el._viletClasses.forEach(cls => el.classList.remove(cls))
    }
    
    const newClasses = new Set<string>()
    
    if (typeof dynamicClasses === "string") {
      dynamicClasses.split(/\s+/).forEach((cls) => {
        if (cls.trim()) newClasses.add(cls.trim())
      })
    } else if (Array.isArray(dynamicClasses)) {
      dynamicClasses.forEach((cls) => {
        if (typeof cls === "string") {
          newClasses.add(cls)
        } else if (isObject(cls)) {
          Object.entries(cls).forEach(([className, condition]) => {
            if (getReactiveValue(condition)) {
              newClasses.add(className)
            }
          })
        }
      })
    } else if (isObject(dynamicClasses)) {
      Object.entries(dynamicClasses).forEach(([className, condition]) => {
        if (getReactiveValue(condition)) {
          newClasses.add(className)
        }
      })
    }
    
    newClasses.forEach(cls => el.classList.add(cls))
    el._viletClasses = newClasses
  })
}

interface StyleElement extends HTMLElement {
  _originalStyle?: string
  _viletStyles?: Record<string, string>
}

function bindStyle(element: HTMLElement, value: ReactiveValue<StyleValue>): () => void {
  const el = element as StyleElement

  if (el._originalStyle === undefined) {
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
    
    const newStyles: Record<string, string> = {}
    
    if (typeof dynamicStyles === "string") {
      const cssString = dynamicStyles.trim()
      if (cssString) {
        const currentStyle = el.getAttribute("style") || ""
        const separator = currentStyle && !currentStyle.endsWith(";") ? "; " : ""
        const finalCssString = cssString.endsWith(";") ? cssString : cssString + ";"
        el.setAttribute("style", currentStyle + separator + finalCssString)
        
        parseCssString(finalCssString, newStyles)
      }
    } else if (isObject(dynamicStyles)) {
      Object.entries(dynamicStyles).forEach(([property, styleValue]) => {
        const finalValue = getReactiveValue(styleValue)
        if (finalValue != null) {
          const cssProperty = camelToKebab(property)
          el.style.setProperty(cssProperty, String(finalValue))
          newStyles[cssProperty] = String(finalValue)
        }
      })
    }
    
    el._viletStyles = newStyles
  })
}

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase()
}

function parseCssString(cssString: string, styles: Record<string, string>): void {
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

function bindFor<T>(
  el: HTMLElement, 
  value: ReactiveValue<T[]>, 
  config: ElementConfig
): () => void {
  const templates = new Map<string, TemplateRef>()
  const itemKeyMap = new WeakMap<object, string>()
  let keyCounter = 0

  return effect(() => {
    const arr = getReactiveValue(value)
    if (!Array.isArray(arr)) return

    const newKeys = arr.map((item, i) => {
      if (config.$key) {
        return config.$key(item, i)
      }
      
      if (typeof item === "object" && item !== null) {
        if (!itemKeyMap.has(item)) {
          itemKeyMap.set(item, `obj_${keyCounter++}`)
        }
        return itemKeyMap.get(item)!
      } else {
        return `${item}_${i}`
      }
    })

    const existingKeys = Array.from(templates.keys())
    const keysToRemove = existingKeys.filter(key => !newKeys.includes(key))
    
    keysToRemove.forEach((key) => {
      const template = templates.get(key)
      if (template) {
        template.unmount(el)
        templates.delete(key)
      }
    })

    newKeys.forEach((key, i) => {
      if (!templates.has(key)) {
        if (config.$each === undefined) throw new Error("required $each binding is missing for $for binding")
        const template = config.$each(arr[i], i)
        template.mount(el)
        templates.set(key, template)
      }
    })

    newKeys.forEach((key, index) => {
      const template = templates.get(key)
      if (template?.elements?.length) {
        const firstElement = template.elements[0]
        const currentPosition = Array.from(el.children).indexOf(firstElement as Element)
        
        if (currentPosition !== index && currentPosition !== -1) {
          template.elements.forEach((element) => {
            if (index >= el.children.length) {
              el.appendChild(element)
            } else {
              el.insertBefore(element, el.children[index])
            }
          })
        }
      }
    })
  })
}