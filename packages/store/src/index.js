export default function store(V) {
    V.registerDirective("$store", (config, context) => {
        if (Array.isArray(config)) {
            initArrayStore(V, config, context)
        } else {
            initObjectStore(V, config, context)
        }
    })
}

function initArrayStore(V, config, context) {
    if (!("localStorage" in window)) {
        console.error("store error: localStorage not available")
        return
    }
    const storage = localStorage

    config.forEach((path) => {
        const initial = storage.getItem(`vilet_${path}`)
        if (initial) {
            setNestedValue(context, path.split("."), JSON.parse(initial))
        }

        V.effect(() => {
            storage.setItem(`vilet_${path}`, JSON.stringify(getNestedValue(context, path.split("."))))
        })
    })
}

function initObjectStore(V, config, context) {
    Object.entries(config).forEach(([path, options]) => {      
        let storage = null
        if (options.storage) {
            storage = options.storage
        } else if ("localStorage" in window) {
            storage = localStorage
        } else {
            console.error(`store error: localStorage not available`)
            return
        }

        const start = () => {
            const initial = storage.getItem(options.key ?? `vilet_${path}`)
            if (initial) {
                if (options.onLoad) {
                    options.onLoad(context, JSON.parse(initial))
                } else {
                    setNestedValue(context, path.split("."), JSON.parse(initial))
                }
            }

            V.effect(() => {
                storage.setItem(options.key ?? `vilet_${path}`, JSON.stringify(getNestedValue(context, path.split("."))))
            })
        }

        if (options.delay) {
            setTimeout(start, options.delay)
        } else {
            start
        }
    })
}

function getNestedValue(obj, path) {
    return path.reduce((current, key) => current?.[key], obj)
}

function setNestedValue(obj, path, value) {
    const pathCopy = [...path]
    const lastKey = pathCopy.pop()
    const target = pathCopy.reduce((current, key) => {
        if (!current[key]) current[key] = {}
        return current[key]
    }, obj)
    target[lastKey] = value
}
