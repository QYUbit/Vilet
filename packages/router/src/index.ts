import { ElementRef, Selecter, TemplateRef } from "../../core/src/types"
import { element, clone } from "../../core/src/index"
import { Navigation, navigation, Route } from "../../navigation/src"

export interface RouteConfig {
    hook?: (route: Route) => boolean
    template?: (route: Route) => (TemplateRef | ElementRef | null)[]
}

export interface RouterConfig {
    $?: string
    $select?: string
    $selector?: string
    $element?: HTMLElement
    $el?: HTMLElement
    $root?: Selecter

    $routes: Record<string, ((route: Route) => (TemplateRef | ElementRef | null)[]) | null>
}

export function router(config: RouterConfig): Navigation {
    const {
        $,
        $select,
        $selector,
        $el,
        $element, 
        $root,
        $routes,
    } = config

    const patterns = Object.keys($routes).filter(path => path.includes(':'))
    const nav = navigation(patterns.length > 0 ? patterns : undefined)

    const ref = element({
        $,
        $select,
        $selector,
        $el,
        $element,
        $root,
        $template: () => {
            const route = $routes[nav.route.value.path]
            return route ? route(nav.route.value) : [null]
        }
    })

    return nav
}
