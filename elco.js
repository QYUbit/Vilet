import { effect, reactive } from "./reactivity";

export function component(obj, options) {
    let state
    let root
    let elementMap = {}
    let effects = []
    let initHook = obj.$init
    let cleanupHook = obj.$cleanup

    function start() {
        if (obj.$state && isObject(obj.$state)) {
            state = reactive(obj.$state)
            obj.$state = state
        }
        
        root = obj.$root? document.querySelector(obj.$root): document

        for (const [key, value] of Object.entries(obj)) {
            if (key.startsWith("$") || key.startsWith("_")) {
                continue
            }
            if (!isObject(value) || (!value.selector && !value.$)) {
                continue
            }
            element(key, value);
        }

        obj.$elements = elementMap

        if (initHook) initHook()
    }
    
    function element(compName, elComp) {
        let el = root.querySelector(elComp.selector ?? elComp.$)
        elementMap[compName] = el

        for (let [key, value] of Object.entries(elComp)) {
            if (key === "text") {
                key = "textContent"
            }
            if (key === "html") {
                key = "innerHTML"
            }

            switch (key) {
                case "$":
                case "$selector":
                    break

                case "show":
                    useEffect(() => {
                        const val = isFunction(value) ? value(state) : value
                        if (val && el.style.display === "none") {
                            el.style.display = "block"
                        }
                        if (!val && el.style.display !== "none") {
                            el.style.display = "none"
                        }
                    })
                    break

                case "value":
                    useEffect(() => {
                        const val = isFunction(value) ? value(state) : value
                        if (el.value !== val) {
                            el.value = val
                        }
                    })
                    break

                case "for":
                    useEffect(() => {
                        const val = isFunction(value) ? value(state) : value
                        if (!val instanceof Array) {
                            return
                        }

                        val.forEach(() => {
                            el.parentElement.appendChild(el.content.cloneNode(true))
                        })
                    })
                    break

                default:
                     if (key.startsWith("on")) {
                        if (!isFunction(value)) {
                            continue
                        }
                        el.addEventListener(key.slice(2).toLocaleLowerCase(), (e) => value(state, e, el))
                        continue
                    }

                    if (!key.startsWith("_")) {
                        useEffect(() => {
                            const val = isFunction(value) ? value(state) : value
                            if (el[key] !== val) {
                                el[key] = val
                            }
                        })
                    }
            }
        }

        obj[compName].$element = el
    }

    function useEffect(callback) {
        const stop = effect(callback, {
            scheduler: () => {
                queueMicrotask(() => callback())
            }
        })
        effects.push(stop)
        return stop
    }

    function cleanup() {
        cleanupHook()
        effects.forEach(stop => stop())
        effects = []
    }

    if (!options || !options.noAutoInit) {
        start()
    }

    return {
        init() {
            start()
        },
        destroy() {
            cleanup()
        }
    }
}

function isFunction(value) {
    return typeof value === "function"
}

function isObject(value) {
    return typeof value === "object" && value !== null
}
