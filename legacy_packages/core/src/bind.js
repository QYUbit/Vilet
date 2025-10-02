import { effect } from "./reactivity"

export function bindElements(config, root, context) {
    const cleanupFns = []

    for (const [key, value] of Object.entries(config)) {
        if (!key.startsWith("$") && key.startsWith("_")) continue
        if (!value.selector && !value.$ && !value.$el && !interpretAsQuery(key)) continue

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

const specialBindings = {}

export function registerBinding(name, handler) {
    specialBindings[name] = handler
}

export function bindProp(el, props, key, context) {
    const value = props[key]

    if (key in specialBindings) {
        return specialBindings[key](el, context, value, props)
    }

    if (key.startsWith("on") && isFunction(value)) {
        el.addEventListener(key.slice(2).toLowerCase(), e => value(context, e, el))
        return () => el.removeEventListener(key.slice(2).toLowerCase(), value)
    }
    
    if (!key.startsWith("_") && !key.startsWith("$")) {
        return effect(() => {
            const val = withContext(value, context, el)
            if (el[key] !== val) el[key] = val
        })
    }
}

function interpretAsQuery(key) {
    return key.startsWith(".") || key.startsWith("#") || key.startsWith("[")
}

function withContext(value, ...args) {
    return typeof value === "function" ? value(...args) : value
}

function isFunction(value) {
    return typeof value === "function" && value !== null
}
