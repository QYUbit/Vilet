import { effect } from "./reactivity";
import { ElementConfig } from "./types";
import { getReactiveValue, isFunction } from "./utils"

export type BindingHandler<T extends HTMLElement = HTMLElement, V = any> = 
  (el: T, value: V, config: ElementConfig) => void | (() => void)

const specialBindings = new Map<string, BindingHandler>()

export function registerBinding<V>(
  name: string, 
  handler: BindingHandler<HTMLElement, V>
): void {
  specialBindings.set(name, handler)
}

export function bindProp<T extends HTMLElement>(
  el: T, 
  key: string, 
  value: any, 
  config: ElementConfig
): void | (() => void) {
  const handler = specialBindings.get(key)
  if (handler) {
    return handler(el, value, config)
  }

  if (key.startsWith("on") && isFunction(value)) {
    const eventName = key.slice(2).toLowerCase()
    const listener = (e: Event) => value(e, el)
    el.addEventListener(eventName, listener)
    return () => el.removeEventListener(eventName, listener)
  }
  
  if (!key.startsWith("_") && !key.startsWith("$")) {
    return effect(() => {
      const val = getReactiveValue(value)
      if ((el as any)[key] !== val) {
        (el as any)[key] = val
      }
    })
  }
}