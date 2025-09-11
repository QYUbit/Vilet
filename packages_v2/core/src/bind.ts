import { effect } from "./reactivity";
import { getReactiveValue, isFunction } from "./utils"

type BindingHandler = (el: HTMLElement, value: any, props: object) => void
const specialBindings: Record<string, BindingHandler> = {}

export function registerBinding(name: string, handler: BindingHandler) {
    specialBindings[name] = handler
}

export function bindProp(el: HTMLElement, key: string, value: any, config: object) {

    if (key in specialBindings) {
        return specialBindings[key](el, value, config)
    }

    if (key.startsWith("on") && isFunction(value)) {
        el.addEventListener(key.slice(2).toLowerCase(), e => value(e, el))
        return () => el.removeEventListener(key.slice(2).toLowerCase(), value)
    }
    
    if (!key.startsWith("_") && !key.startsWith("$")) {
        return effect(() => {
            const val = getReactiveValue(value)
            if ((el as any)[key] !== val) (el as any)[key] = val
        })
    }
}
