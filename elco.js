import { effect, reactive } from "./reactivity";

export function component(obj) {
    let state
    let elementMap = {}
    let effects = []
    let init

    if (obj.state) {
        state = reactive(obj.state)
        obj.state = state
    }

    for (const [key, value] of Object.entries(obj)) {
        switch (key) {
            case "state":
                break

            case "init":
                init = value
        
            default:
                if (!isObject(value) || !value.selector) {
                    continue
                }
                element(value);
        }
    }

    function element(obj2) {
        let el = document.querySelector(value)
        elementMap[key] = el

        for (let [key, value] of Object.entries(obj2)) {
            if (key === "text") {
                key = "textContent"
            }
            if (key === "html") {
                key = "innerHTML"
            }

            switch (key) {
                case "selector":
                    break

                case "show":
                    useEffect(() => {
                        const val = typeof value === "function" ? value(state) : value
                        if (val && el.style.display === "none") {
                            el.style.display = "block"
                        }
                        if (!val && el.style.display !== "none") {
                            el.style.display = "none"
                        }
                    })
                    break

                default:
                     if (key.startsWith("on")) {
                        if (typeof value !== "function") {
                            continue
                        }
                        el.addEventListener(key.slice(2).toLocaleLowerCase(), (e) => value(state, e, el))
                        continue
                    }

                    if (!key.startsWith("_")) {
                        useEffect(() => {
                            const val = typeof value === "function" ? value(state) : value
                            if (el[key] !== val) {
                                el[key] = val
                            }
                        })
                    }
            }
        }
    }

    function useEffect(callback) {
        const stop = effect(callback)
        effects.push(stop)
        return stop
    }

    function cleanup() {
        effects.forEach(stop => stop())
        effects = []
    }

    init()

    return () => {
        cleanup()
    }
}

function isObject(value) {
    return typeof value === "object" && value !== null
}
