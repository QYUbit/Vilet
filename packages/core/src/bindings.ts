import { registerBinding } from "./bind"
import { effect } from "./reactivity"
import { ClassValue, ElementConfig, ElementRef, ReactiveValue, StyleValue, TemplateRef } from "./types"
import { getReactiveValue, isObject } from "./utils"

export function initBindings(): void {
  registerBinding<ReactiveValue<string | number>>("$text", bindText)
  registerBinding<ReactiveValue<boolean>>("$show", bindShow)
  registerBinding<ReactiveValue<ClassValue>>("$class", bindClass)
  registerBinding<ReactiveValue<StyleValue>>("$style", bindStyle)
  registerBinding<ReactiveValue<(TemplateRef | ElementRef | undefined)[]>>("$template", bindTemplate)
  registerBinding<ReactiveValue<any[]>>("$for", bindFor)
  registerBinding("$if", () => {})
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

function bindShow(el: HTMLElement, value: ReactiveValue<boolean>): () => void {
  return effect(() => {
    const shouldShow = getReactiveValue(value)

    const showEl = el as ShowElement
    if (showEl._shouldShow === shouldShow) return

    showEl._shouldShow = shouldShow
    el.style.display = shouldShow ? "" : "none"
  })
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

function bindTemplate(
  el: HTMLElement,
  value: ReactiveValue<(TemplateRef | ElementRef | undefined)[]>,
  config: ElementConfig
): () => void {
  let show = false
  let _template: TemplateRef | null = null
  let cleanup: Function[] = []

  const effectCleanup = effect(() => {
    const shouldShow = config.$if ? getReactiveValue(config.$if) : true
    const [template, cleanupFns] = getReturnValues(getReactiveValue(value), "$template")
    const templateChanged = _template?.id !== template?.id
    const showChanged = shouldShow !== show

    if (templateChanged || (!shouldShow && showChanged)) {
      _template?.unmount(el)
      cleanup.forEach(fn => fn())
      _template = null
      cleanup = []
    }

    if (templateChanged || (shouldShow && showChanged)) {
      if (!template) return
      template.mount(el)
      _template = template
      cleanup = cleanupFns
    }
  })

  return () => {
    effectCleanup()
    cleanup.forEach(fn => fn())
  }
}

function bindFor<T>(
  el: HTMLElement, 
  value: ReactiveValue<T[]>, 
  config: ElementConfig
): () => void {
  const templates = new Map<string, TemplateRef>()
  const cleanup = new Map<string, Function[]>()
  const itemKeyMap = new WeakMap<object, string>()
  let keyCounter = 0

  const effectCleanup = effect(() => {
    const arr = getReactiveValue(value)
    if (!Array.isArray(arr)) return

    const newKeys = arr.map((item, i) => {
      if (config.$key) {
        return config.$key(item, i)
      }
      
      if (isObject(item)) {
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

      const cleanupFns = cleanup.get(key)
      if (cleanupFns && cleanupFns.length > 0) {
        cleanupFns.forEach(fn => fn())
        cleanup.delete(key)
      }
    })

    newKeys.forEach((key, i) => {
      if (!templates.has(key)) {
        if (!config.$each) throw new Error("required $each binding is missing for $for binding")
        const [template, cleanupFns] = getReturnValues(config.$each(arr[i], i), "$each")
        if (!template) return

        template.mount(el)

        templates.set(key, template)
        cleanup.set(key, cleanupFns)
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

  return () => {
    effectCleanup()
    cleanup.forEach(temp => temp.forEach(fn => fn()))
  }
}

function getReturnValues(values: (TemplateRef | ElementRef | undefined)[] | undefined, bindingName: string): [TemplateRef | null, Function[]] {
  if (!values) return [null, []]

  let template: TemplateRef | null = null;
  let cleanupFns: Function[] = [];

  values.forEach((value) => {
    if (!value) return;

    if ("mounted" in value) {
      if (template) {
        console.warn(`${bindingName} must not return more than one templateRef`)
        return
      }
      template = value
    } else {
      cleanupFns.push(...value.cleanup)
    }
  })

  if (!template) {
    console.error(`${bindingName} has to return a templateRef`)
  }
  return [template, cleanupFns]
}