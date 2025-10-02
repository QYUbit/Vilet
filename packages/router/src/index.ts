import { ref, effect } from "../../core/src/reactivity"
import { Ref } from "../../core/src/types"

export interface Route {
    path: string
    params: Record<string, string>
    query: Record<string, string>
}

export interface Router {
    route: Ref<Route>
    push(path: string): void
    replace(path: string): void
}

function parsePath(hash: string): Route {
    const path = hash.slice(1) || '/'
    const [pathPart, queryPart] = path.split('?')
    
    const query: Record<string, string> = {}
    if (queryPart) {
        queryPart.split('&').forEach(param => {
            const [key, val] = param.split('=')
            if (key) query[decodeURIComponent(key)] = decodeURIComponent(val || '')
        })
    }
    
    return { path: pathPart, params: {}, query }
}

function matchRoute(pattern: string, path: string): Record<string, string> | null {
    const patternParts = pattern.split('/').filter(Boolean)
    const pathParts = path.split('/').filter(Boolean)
    
    if (patternParts.length !== pathParts.length) return null
    
    const params: Record<string, string> = {}
    
    for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(':')) {
            params[patternParts[i].slice(1)] = pathParts[i]
        } else if (patternParts[i] !== pathParts[i]) {
            return null
        }
    }
    
    return params
}

export function router(routes?: Record<string, any>): Router {
    const route = ref<Route>(parsePath(location.hash))
    
    const updateRoute = () => {
        const parsed = parsePath(location.hash)
        
        if (routes) {
            for (const [pattern, _] of Object.entries(routes)) {
                const params = matchRoute(pattern, parsed.path)
                if (params) {
                    parsed.params = params
                    break
                }
            }
        }
        
        route.value = parsed
    }
    
    window.addEventListener('hashchange', updateRoute)
    updateRoute()
    
    return {
        route,
        push: (path: string) => location.hash = '#' + path,
        replace: (path: string) => location.replace('#' + path)
    }
}

export function match(pattern: string, route: Ref<Route>): Ref<boolean> {
    const matches = ref(false)
    
    effect(() => {
        matches.value = matchRoute(pattern, route.value.path) !== null
    })
    
    return matches
}