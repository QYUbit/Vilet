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
            let itemKeyMap = new WeakMap()
            let keyCounter = 0

            return effect(() => {
                // Generate keys for new array
                const arr = ensureValue(value, context)
                const newKeys = arr.map((item, i) => {
                    if (props.$key) {
                        return ensureValue(props.$key, context, item, i)
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
