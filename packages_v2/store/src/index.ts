import { Ref } from "../../core/src/types"
import { effect } from "../../core/src/reactivity"

let key = 0

// This won't work
function getAutoKey(): string {
    const k = key
    key++
    return `vilet_${k}`
}

export interface StoreOptions<T> {
    storage?: "localStorage" | "sessionStorage"
    key?: string
    onload?: (value: T) => void
}

export function store<T>(ref: Ref<T>, options?: StoreOptions<T>) {
    const storageStr = options?.storage || "localStorage"
    if (!(storageStr in window)) {
        console.warn(`Cannot use store plugin, since ${storageStr} is not available`)
        return
    }

    const storage = window[storageStr]

    const initial = storage.getItem(options?.key ?? getAutoKey())
    if (initial) {
        if (options?.onload) {
            options.onload(JSON.parse(initial) as T)
        } else {
            console.log(`Load store: ${initial}`)
            ref.value = JSON.parse(initial)
        }
    }
    
    effect(() => {
        console.log(`Store effect: ${ref.value}`)
        storage.setItem(options?.key ?? getAutoKey(), JSON.stringify(ref.value))
    })
}