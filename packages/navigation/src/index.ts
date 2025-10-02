import { ref } from "../../core/src/reactivity"
import { TemplateRef, ElementRef, Ref } from "../../core/src/types"

export interface RouteParams {
    [key: string]: string
}

export interface RouteQuery {
    [key: string]: string
}

export interface RouteLocation {
    path: string
    params: RouteParams
    query: RouteQuery
    hash: string
}

export interface RouteGuardContext {
    to: RouteLocation
    from: RouteLocation
}

export type RouteGuard = (context: RouteGuardContext) => boolean | Promise<boolean>
export type RouteComponent = () => (TemplateRef | ElementRef | null)[]

export interface RouteConfig {
    path: string
    component?: RouteComponent
    children?: RouteConfig[]
    beforeEnter?: RouteGuard
    name?: string
    redirect?: string
    meta?: Record<string, any>
}

export interface NavigateOptions {
    replace?: boolean
    query?: RouteQuery
    hash?: string
}

export interface Router {
    currentRoute: Ref<RouteLocation>
    routes: RouteConfig[]
    push(path: string, options?: NavigateOptions): Promise<void>
    replace(path: string, options?: NavigateOptions): Promise<void>
    back(): void
    forward(): void
    go(delta: number): void
    beforeEach(guard: RouteGuard): () => void
    afterEach(callback: (to: RouteLocation, from: RouteLocation) => void): () => void
    addRoute(route: RouteConfig): void
    removeRoute(name: string): void
    hasRoute(name: string): boolean
    getRoutes(): RouteConfig[]
    resolve(path: string): RouteLocation | null
}

interface MatchedRoute {
    route: RouteConfig
    params: RouteParams
}

class RouterImpl implements Router {
    currentRoute: Ref<RouteLocation>
    routes: RouteConfig[]
    private guards: RouteGuard[] = []
    private afterHooks: Array<(to: RouteLocation, from: RouteLocation) => void> = []
    private isNavigating = false

    constructor(routes: RouteConfig[]) {
        this.routes = routes
        this.currentRoute = ref<RouteLocation>({
            path: '/',
            params: {},
            query: {},
            hash: ''
        })

        this.init()
    }

    private init(): void {
        window.addEventListener('hashchange', () => this.handleRouteChange())
        window.addEventListener('load', () => this.handleRouteChange())
        
        this.handleRouteChange()
    }

    private async handleRouteChange(): Promise<void> {
        if (this.isNavigating) return
        
        const hash = window.location.hash.slice(1) || '/'
        const [pathWithQuery, hashFragment] = hash.split('#')
        const [path, queryString] = pathWithQuery.split('?')
        
        const newLocation: RouteLocation = {
            path: path || '/',
            params: {},
            query: this.parseQuery(queryString || ''),
            hash: hashFragment || ''
        }

        const matched = this.matchRoute(newLocation.path)
        if (matched) {
            newLocation.params = matched.params
            
            const canNavigate = await this.runGuards(newLocation, this.currentRoute.value)
            
            if (canNavigate) {
                const oldRoute = this.currentRoute.value
                this.currentRoute.value = newLocation
                this.runAfterHooks(newLocation, oldRoute)
            } else {
                this.isNavigating = true
                window.location.hash = this.buildHash(this.currentRoute.value)
                this.isNavigating = false
            }
        } else {
            console.warn(`No route matched for path: ${newLocation.path}`)
        }
    }

    private matchRoute(path: string, routes: RouteConfig[] = this.routes, parentPath = ''): MatchedRoute | null {
        for (const route of routes) {
            const fullPath = this.joinPaths(parentPath, route.path)
            const match = this.matchPath(fullPath, path)
            
            if (match) {
                return { route, params: match }
            }

            if (route.children) {
                const childMatch = this.matchRoute(path, route.children, fullPath)
                if (childMatch) return childMatch
            }
        }
        
        return null
    }

    private matchPath(routePath: string, actualPath: string): RouteParams | null {
        const routeSegments = routePath.split('/').filter(Boolean)
        const pathSegments = actualPath.split('/').filter(Boolean)

        if (routeSegments.length !== pathSegments.length) {
            return null
        }

        const params: RouteParams = {}

        for (let i = 0; i < routeSegments.length; i++) {
            const routeSegment = routeSegments[i]
            const pathSegment = pathSegments[i]

            if (routeSegment.startsWith(':')) {
                const paramName = routeSegment.slice(1)
                params[paramName] = pathSegment
            } else if (routeSegment !== pathSegment) {
                return null
            }
        }

        return params
    }

    private joinPaths(...paths: string[]): string {
        return '/' + paths
            .join('/')
            .split('/')
            .filter(Boolean)
            .join('/')
    }

    private parseQuery(queryString: string): RouteQuery {
        const query: RouteQuery = {}
        if (!queryString) return query

        queryString.split('&').forEach(param => {
            const [key, value] = param.split('=')
            if (key) {
                query[decodeURIComponent(key)] = decodeURIComponent(value || '')
            }
        })

        return query
    }

    private buildQuery(query: RouteQuery): string {
        const params = Object.entries(query)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&')
        return params ? `?${params}` : ''
    }

    private buildHash(location: RouteLocation): string {
        let hash = `#${location.path}`
        
        if (Object.keys(location.query).length > 0) {
            hash += this.buildQuery(location.query)
        }
        
        if (location.hash) {
            hash += `#${location.hash}`
        }
        
        return hash
    }

    private async runGuards(to: RouteLocation, from: RouteLocation): Promise<boolean> {
        const matched = this.matchRoute(to.path)
        if (matched?.route.beforeEnter) {
            const result = await matched.route.beforeEnter({ to, from })
            if (!result) return false
        }

        for (const guard of this.guards) {
            const result = await guard({ to, from })
            if (!result) return false
        }

        return true
    }

    private runAfterHooks(to: RouteLocation, from: RouteLocation): void {
        this.afterHooks.forEach(hook => hook(to, from))
    }

    async push(path: string, options: NavigateOptions = {}): Promise<void> {
        this.isNavigating = true
        
        const location: RouteLocation = {
            path,
            params: {},
            query: options.query || {},
            hash: options.hash || ''
        }

        window.location.hash = this.buildHash(location)
        
        this.isNavigating = false
    }

    async replace(path: string, options: NavigateOptions = {}): Promise<void> {
        this.isNavigating = true
        
        const location: RouteLocation = {
            path,
            params: {},
            query: options.query || {},
            hash: options.hash || ''
        }

        window.location.replace(this.buildHash(location))
        
        this.isNavigating = false
    }

    back(): void {
        window.history.back()
    }

    forward(): void {
        window.history.forward()
    }

    go(delta: number): void {
        window.history.go(delta)
    }

    beforeEach(guard: RouteGuard): () => void {
        this.guards.push(guard)
        return () => {
            const index = this.guards.indexOf(guard)
            if (index > -1) {
                this.guards.splice(index, 1)
            }
        }
    }

    afterEach(callback: (to: RouteLocation, from: RouteLocation) => void): () => void {
        this.afterHooks.push(callback)
        return () => {
            const index = this.afterHooks.indexOf(callback)
            if (index > -1) {
                this.afterHooks.splice(index, 1)
            }
        }
    }

    addRoute(route: RouteConfig): void {
        this.routes.push(route)
    }

    removeRoute(name: string): void {
        const index = this.routes.findIndex(r => r.name === name)
        if (index > -1) {
            this.routes.splice(index, 1)
        }
    }

    hasRoute(name: string): boolean {
        return this.routes.some(r => r.name === name)
    }

    getRoutes(): RouteConfig[] {
        return [...this.routes]
    }

    resolve(path: string): RouteLocation | null {
        const matched = this.matchRoute(path)
        if (!matched) return null

        return {
            path,
            params: matched.params,
            query: {},
            hash: ''
        }
    }
}

export function createRouter(routes: RouteConfig[]): Router {
    return new RouterImpl(routes)
}

export function getMatchedComponent(router: Router): RouteComponent | null {
    const currentPath = router.currentRoute.value.path
    
    function findComponent(routes: RouteConfig[], path: string, parentPath = ''): RouteComponent | null {
        for (const route of routes) {
            const fullPath = '/' + [parentPath, route.path].join('/').split('/').filter(Boolean).join('/')
            const match = matchPath(fullPath, path)
            
            if (match) {
                if (route.redirect) {
                    return findComponent(routes, route.redirect)
                }
                return route.component || null
            }

            if (route.children) {
                const childComponent = findComponent(route.children, path, fullPath)
                if (childComponent) return childComponent
            }
        }
        return null
    }

    function matchPath(routePath: string, actualPath: string): boolean {
        const routeSegments = routePath.split('/').filter(Boolean)
        const pathSegments = actualPath.split('/').filter(Boolean)

        if (routeSegments.length !== pathSegments.length) {
            return false
        }

        for (let i = 0; i < routeSegments.length; i++) {
            const routeSegment = routeSegments[i]
            const pathSegment = pathSegments[i]

            if (!routeSegment.startsWith(':') && routeSegment !== pathSegment) {
                return false
            }
        }

        return true
    }

    return findComponent(router.routes, currentPath)
}