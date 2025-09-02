import { effect } from "./reactivity"

export function bindProp(el, props, key, context) {
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
            let templates = {}
 
            return effect(() => {
                // Genrate keys for new array
                const arr = ensureValue(value, context)
                const newKeys = arr.map((item, i) => ensureValue(props.$key, context, item, i) ?? JSON.stringify(item))

                // Filter out and delete templates
                templates = Object.keys(templates)
                .filter((key) => {
                    if (newKeys.includes(key)) {
                        return true
                    } else {
                        templates[key].unmount(el)
                        templates[key].destroy()
                        return false
                    }
                })
                .reduce((obj, key) => {
                    obj[key] = templates[key]
                    return obj
                }, {})

                // Generate new templates
                newKeys.forEach((key, i) => {
                    if (!Object.keys(templates).includes(key)) {
                        const ref = ensureValue(props.$each, context, arr[i], i)
                        ref.init()
                        ref.mount(el)
                        templates[key] = ref
                    }
                })

                // ? Ensure elements are in right order ?
            })
        case "$each":
        case "$key":
            break
        case "$template":
            let templateCleanup = null
            
            return effect(() => {
                if (templateCleanup) templateCleanup()
                el.innerHTML = ""

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
