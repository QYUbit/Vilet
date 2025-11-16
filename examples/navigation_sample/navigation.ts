/*import { element, clone, ref } from "../../packages/core/src/index"
import { createNavigation, getMatchedComponent } from "../../packages/navigation/src/index"

// Authentication state
const isAuthenticated = ref(false)

// Admin Dashboard Layout
function AdminLayout() {
    const template = clone("#admin-layout-template")
    if (!template) throw new Error("#admin-layout-template not found")

    // Admin navigation links
    const navLinks = [
        { text: 'Dashboard', path: '/admin/dashboard' },
        { text: 'Users', path: '/admin/users' },
        { text: 'Settings', path: '/admin/settings' }
    ]

    const navContainer = template.fragment.querySelector("#admin-nav")
    if (navContainer) {
        navLinks.forEach(link => {
            const a = document.createElement('a')
            a.textContent = link.text
            a.onclick = () => router.push(link.path)
            navContainer.appendChild(a)
        })
    }

    // Nested router view for child routes
    element({
        $root: template.fragment,
        $selector: "#admin-content",
        $template: () => {
            const component = getMatchedComponent(router)
            return component ? component() : []
        }
    })

    return [template]
}

// Admin Dashboard Page
function DashboardPage() {
    const template = clone("#dashboard-template")
    if (!template) throw new Error("#dashboard-template not found")

    element({
        $root: template.fragment,
        $selector: "#dashboard-title",
        textContent: "Admin Dashboard"
    })

    return [template]
}

// Admin Users Page
function AdminUsersPage() {
    const template = clone("#admin-users-template")
    if (!template) throw new Error("#admin-users-template not found")

    element({
        $root: template.fragment,
        $selector: "#users-list",
        textContent: "List of users..."
    })

    return [template]
}

// Admin Settings Page
function AdminSettingsPage() {
    const template = clone("#admin-settings-template")
    if (!template) throw new Error("#admin-settings-template not found")

    element({
        $root: template.fragment,
        $selector: "#settings-form",
        textContent: "Settings form..."
    })

    return [template]
}

// Login Page
function LoginPage() {
    const template = clone("#login-template")
    if (!template) throw new Error("#login-template not found")

    element({
        $root: template.fragment,
        $selector: "#login-button",
        onclick: () => {
            isAuthenticated.value = true
            router.push('/admin')
        }
    })

    return [template]
}

// Create router with nested routes
const router = createNavigation([
    {
        path: '/',
        name: 'home',
        component: () => {
            const template = clone("#home-simple-template")
            if (!template) throw new Error("#home-simple-template not found")
            return [template]
        }
    },
    {
        path: '/login',
        name: 'login',
        component: LoginPage,
        meta: { requiresGuest: true }
    },
    {
        path: '/admin',
        name: 'admin',
        component: AdminLayout,
        meta: { requiresAuth: true },
        beforeEnter: ({ to, from }) => {
            console.log('Admin beforeEnter guard')
            if (!isAuthenticated.value) {
                console.log('Not authenticated, redirecting to login')
                router.push('/login')
                return false
            }
            return true
        },
        children: [
            {
                path: '',
                redirect: '/admin/dashboard'
            },
            {
                path: 'dashboard',
                name: 'admin-dashboard',
                component: DashboardPage,
                meta: { requiresAuth: true }
            },
            {
                path: 'users',
                name: 'admin-users',
                component: AdminUsersPage,
                meta: { requiresAuth: true, requiresAdmin: true }
            },
            {
                path: 'settings',
                name: 'admin-settings',
                component: AdminSettingsPage,
                meta: { requiresAuth: true }
            }
        ]
    },
    {
        path: '/profile/:userId',
        name: 'profile',
        component: () => {
            const template = clone("#profile-template")
            if (!template) throw new Error("#profile-template not found")
            
            const userId = router.currentRoute.value.params.userId
            
            element({
                $root: template.fragment,
                $selector: "#profile-id",
                textContent: `Viewing profile: ${userId}`
            })
            
            return [template]
        },
        beforeEnter: async ({ to, from }) => {
            // Simulate async validation (e.g., check if user exists)
            console.log(`Validating user ${to.params.userId}...`)
            await new Promise(resolve => setTimeout(resolve, 500))
            
            // Example: block access to certain user IDs
            if (to.params.userId === '999') {
                console.log('User not found')
                router.push('/')
                return false
            }
            
            return true
        }
    }
])

// Global before guard - runs for every navigation
router.beforeEach(({ to, from }) => {
    console.log(`Global beforeEach: ${from.path} -> ${to.path}`)
    
    // Find the matched route to access meta
    const matched = findMatchedRoute(to.path)
    
    // Check authentication requirement
    if (matched?.meta?.requiresAuth && !isAuthenticated.value) {
        console.log('Route requires authentication')
        router.push('/login')
        return false
    }
    
    // Redirect authenticated users away from guest pages
    if (matched?.meta?.requiresGuest && isAuthenticated.value) {
        console.log('Already authenticated')
        router.push('/admin')
        return false
    }
    
    return true
})

// Helper to find matched route config
function findMatchedRoute(path: string): any | null {
    function search(routes: any[], parentPath = ''): any | null {
        for (const route of routes) {
            const fullPath = parentPath + route.path
            if (matchesPath(fullPath, path)) {
                return route
            }
            if (route.children) {
                const child = search(route.children, fullPath)
                if (child) return child
            }
        }
        return null
    }
    return search(router.getRoutes())
}

function matchesPath(pattern: string, path: string): boolean {
    const patternParts = pattern.split('/').filter(Boolean)
    const pathParts = path.split('/').filter(Boolean)
    
    if (patternParts.length !== pathParts.length) return false
    
    for (let i = 0; i < patternParts.length; i++) {
        if (!patternParts[i].startsWith(':') && patternParts[i] !== pathParts[i]) {
            return false
        }
    }
    
    return true
}

// Global after hook - runs after successful navigation
router.afterEach((to, from) => {
    console.log(`Navigation completed: ${from.path} -> ${to.path}`)

    // Update page title based on route
    if (to.path) {
        document.title = `App - ${to.path}`
    }
    
    // Track page view
    console.log('Track page view:', to.path)
})

// Setup main router view
element({
    $selector: "#app-router-view",
    $template: () => {
        const component = getMatchedComponent(router)
        if (component) {
            return component()
        }
        return []
    }
})

// Setup navigation links
element({
    $selector: "#nav-home",
    onclick: () => router.push('/')
})

element({
    $selector: "#nav-admin",
    onclick: () => router.push('/admin')
})

element({
    $selector: "#nav-profile",
    onclick: () => router.push('/profile/123')
})

element({
    $selector: "#nav-login",
    onclick: () => router.push('/login')
})

// Logout functionality
element({
    $selector: "#logout-button",
    onclick: () => {
        isAuthenticated.value = false
        router.push('/login')
    }
})

// Show/hide elements based on auth state
element({
    $selector: "#auth-status",
    textContent: () => isAuthenticated.value ? 'Logged In' : 'Logged Out'
})

element({
    $selector: "#auth-actions",
    style: () => ({ display: isAuthenticated.value ? 'inline' : 'none' })
})

// Advanced: Lazy loading routes
function lazyLoad(importFn: () => Promise<any>) {
    return () => {
        return importFn().then(module => module.default())
    }
}

// Add route dynamically
function addDynamicRoute() {
    router.addRoute({
        path: '/dynamic',
        name: 'dynamic',
        component: () => {
            const template = clone("#dynamic-template")
            if (!template) throw new Error("#dynamic-template not found")
            return [template]
        }
    })
    
    console.log('Dynamic route added!')
}

// Query parameter handling example
element({
    $selector: "#search-button",
    onclick: () => {
        router.push('/search', {
            query: {
                q: 'typescript',
                page: '1',
                sort: 'relevance'
            }
        })
    }
})

// Hash navigation example
element({
    $selector: "#section-link",
    onclick: () => {
        router.push('/docs', {
            hash: 'section-2'
        })
    }
})*/