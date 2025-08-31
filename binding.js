import { effect } from "./reactivity"

export function bindProp(el, props, key, state) {
    let templateCleanups = []

    const value = props[key]

    switch (key) {
        case "show":
            return effect(() => {
                const val = isFunction(value) ? value(state) : value
                el.style.display = val ? "block" : "none"
            })
        case "value":
            return effect(() => {
                const val = isFunction(value) ? value(state) : value
                if (el.value !== val) el.value = val
            })
        case "$for":
            return effect(() => {
                templateCleanups.forEach(fn => fn())
                templateCleanups = []
                el.innerHTML = ""

                const val = isFunction(value) ? value(state) : value
                val.forEach((item, i) => {
                    const itemVal = isFunction(props["$item"]) ? props["$item"](item, i, state) : props["$item"]
                    const ref = itemVal()
                    ref.mount(el)
                    templateCleanups.push(ref.destroy)
                });
            })
        case "$item":
            break
        default:
            if (key.startsWith("on") && isFunction(value)) {
                el.addEventListener(key.slice(2).toLowerCase(), e => value(state, e, el))
                return () => el.removeEventListener(key.slice(2).toLowerCase(), value)
            }
            if (!key.startsWith("_")) {
                return effect(() => {
                    const val = isFunction(value) ? value(state) : value
                    el[key === "text"? "textContent": key === "html"? "innerHTML": key] = val
                })
            }
    }
}

export function bindElements(config, root, state) {
    //const elementMap = {}
    const cleanupFns = []

    for (const [key, value] of Object.entries(config)) {
        if (key === "$" || key === "$selector" || key.startsWith("_")) continue
        if (!isObject(value) || (!value.selector && !value.$)) continue

        const el = root.querySelector(value.$selector ?? value.$)
        //elementMap[key] = el
        //obj[key].$element = el

        for (const prop in value) {
            const cleanup = bindProp(el, value, prop, state)
            if (isFunction(cleanup)) cleanupFns.push(cleanup)
        }
    }

    //obj.$elements = elementMap
    return cleanupFns
}

function isFunction(value) {
    return typeof value === "function"
}

function isObject(value) {
    return typeof value === "object" && value !== null
}
