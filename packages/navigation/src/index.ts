import { ref, effect } from "../../core/src/reactivity"
import { Ref } from "../../core/src/types"

export interface Route {
    path: string
    params: Record<string, string>
    query: Record<string, string>
    hash: string
}

export interface Navigation {
    route: Ref<Route>
    push(path: string, query?: Record<string, string>, hash?: string): void
    replace(path: string, query?: Record<string, string>, hash?: string): void
    back(): void
    forward(): void
    go(delta: number): void
}

function parsePath(locationHash: string): Route {
    const fullPath = locationHash.slice(1) || '/'
    const [pathWithQuery, fragmentHash] = fullPath.split('#')
    const [pathPart, queryPart] = pathWithQuery.split('?')
    
    const query: Record<string, string> = {}
    if (queryPart) {
        queryPart.split('&').forEach(param => {
            const [key, val] = param.split('=')
            if (key) query[decodeURIComponent(key)] = decodeURIComponent(val || '')
        })
    }
    
    return { 
        path: pathPart, 
        params: {}, 
        query,
        hash: fragmentHash || ''
    }
}

function buildPath(path: string, query?: Record<string, string>, hash?: string): string {
    let result = path
    
    if (query && Object.keys(query).length > 0) {
        const queryString = Object.entries(query)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&')
        result += `?${queryString}`
    }
    
    if (hash) {
        result += `#${hash}`
    }
    
    return result
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

export function navigation(routes?: string[]): Navigation {
    const route = ref<Route>(parsePath(location.hash))
    
    const updateRoute = () => {
        const parsed = parsePath(location.hash)
        
        if (routes) {
            for (const pattern of routes) {
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
        push: (path: string, query?: Record<string, string>, hash?: string) => {
            location.hash = '#' + buildPath(path, query, hash)
        },
        replace: (path: string, query?: Record<string, string>, hash?: string) => {
            location.replace('#' + buildPath(path, query, hash))
        },
        back(): void {
            window.history.back()
        },
        forward(): void {
            window.history.forward()
        },
        go(delta: number): void {
            window.history.go(delta)
        },
    }
}

export function match(pattern: string, route: Ref<Route>): Ref<boolean> {
    const matches = ref(false)
    
    effect(() => {
        matches.value = matchRoute(pattern, route.value.path) !== null
    })
    
    return matches
}
