import { Ref } from "../../core/src/types"
import { effect } from "../../core/src/reactivity"
import { log } from "../../core/src/log"

export interface StoreOptions<T> {
    storage?: "localStorage" | "sessionStorage"
    key: string
    onload?: (value: T) => void
}

export function store<T>(ref: Ref<T>, options: StoreOptions<T>) {
    const storageStr = options.storage || "localStorage"
    if (!(storageStr in window)) {
        console.warn(`Cannot use store plugin, since ${storageStr} is not available`)
        return
    }

    const storage = window[storageStr]

    const initial = storage.getItem(options.key);
    if (initial) {
        if (options.onload) {
            options.onload(JSON.parse(initial) as T)
        } else {
            log(`Load store: ${initial}`)
            ref.value = JSON.parse(initial)
        }
    }
    
    effect(() => {
        log(`Store effect: ${ref.value}`)
        storage.setItem(options.key, JSON.stringify(ref.value))
    })
}