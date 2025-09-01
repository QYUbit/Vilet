import { effect } from "./reactivity"

export function bindProp(el, props, key, context) {
    let forCleanups = []
    let templateCleanup = null

    const value = props[key]

    switch (key) {
        case "show":
            return effect(() => {
                const shouldShow = ensureValue(value, context)
                el.style.display = shouldShow ? "block" : "none"
            })
        case "value":
            return effect(() => {
                const val = ensureValue(value, context)
                if (el.value !== val) el.value = val
            })
        case "$for":
            return effect(() => {
                forCleanups.forEach(fn => fn())
                forCleanups = []
                el.innerHTML = ""

                const arr = ensureValue(value, context)
                arr.forEach((item, i) => {
                    const ref = ensureValue(props["$each"], context, item, i)
                    ref.init()
                    ref.mount(el)
                    forCleanups.push(ref.destroy)
                });
            })
        case "$each":
            break
        case "$template":
            if (templateCleanup) templateCleanup()
            templateCleanup = null
            el.innerHTML = ""

            return effect(() => {
                const ref = ensureValue(value, context)
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
                key = (key === "text" ? "textContent" : key === "html"? "innerHTML": key)

                return effect(() => {
                    const val = ensureValue(value, context)
                    if (el[key] !== val) el[key] = val
                })
            }
    }
}

export function bindElements(config, root, context) {
    const cleanupFns = []

    for (const [key, value] of Object.entries(config)) {
        if (key === "$" || key === "$selector" || key.startsWith("_")) continue
        if (!isObject(value) || (!value.selector && !value.$ && !interpretAsQuery(key))) continue

        let el
        if (interpretAsQuery(key)) {
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
