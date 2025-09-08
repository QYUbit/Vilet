// 1. OUTSIDE CLICKS (wie Alpine.js x-outside)
function bindOutside(el, handler, context) {
    const outsideHandler = (event) => {
        if (!el.contains(event.target)) {
            handler(context, event)
        }
    }
    
    document.addEventListener('click', outsideHandler)
    
    return () => document.removeEventListener('click', outsideHandler)
}

// 2. HTMX-STYLE HTTP REQUESTS
function bindHttp(el, config, context) {
    const { url, method = 'GET', trigger = 'click', target, swap = 'innerHTML' } = config
    
    const httpHandler = async (event) => {
        try {
            const finalUrl = typeof url === 'function' ? url(context) : url
            const response = await fetch(finalUrl, {
                method: method.toUpperCase(),
                headers: { 'Content-Type': 'application/json' },
                body: method !== 'GET' ? JSON.stringify(context) : undefined
            })
            
            if (target) {
                const targetEl = document.querySelector(target)
                if (targetEl) {
                    if (swap === 'innerHTML') {
                        targetEl.innerHTML = await response.text()
                    } else if (swap === 'outerHTML') {
                        targetEl.outerHTML = await response.text()
                    } else if (swap === 'append') {
                        targetEl.insertAdjacentHTML('beforeend', await response.text())
                    }
                }
            } else {
                // Update context with JSON response
                const data = await response.json()
                Object.assign(context, data)
            }
        } catch (error) {
            console.error('HTTP request failed:', error)
        }
    }
    
    el.addEventListener(trigger, httpHandler)
    return () => el.removeEventListener(trigger, httpHandler)
}

// 3. INTERSECTION OBSERVER (Lazy Loading, Scroll Triggers)
function bindIntersect(el, handler, context, options = {}) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                handler(context, entry)
            }
        })
    }, { threshold: 0.1, ...options })
    
    observer.observe(el)
    
    return () => observer.disconnect()
}

// 4. RESIZE OBSERVER 
function bindResize(el, handler, context) {
    const observer = new ResizeObserver((entries) => {
        entries.forEach(entry => {
            handler(context, {
                width: entry.contentRect.width,
                height: entry.contentRect.height,
                element: entry.target
            })
        })
    })
    
    observer.observe(el)
    return () => observer.disconnect()
}

// 5. KEYBOARD SHORTCUTS
function bindKeyboard(el, config, context) {
    const { keys, handler, global = false } = config
    
    const keyHandler = (event) => {
        const pressed = []
        if (event.ctrlKey) pressed.push('ctrl')
        if (event.shiftKey) pressed.push('shift')  
        if (event.altKey) pressed.push('alt')
        pressed.push(event.key.toLowerCase())
        
        const combination = pressed.join('+')
        if (keys.includes(combination)) {
            event.preventDefault()
            handler(context, event)
        }
    }
    
    const target = global ? document : el
    target.addEventListener('keydown', keyHandler)
    
    return () => target.removeEventListener('keydown', keyHandler)
}

// 6. ANIMATION UTILITIES
function bindAnimate(el, config, context) {
    const { 
        enter = 'fadeIn', 
        exit = 'fadeOut', 
        duration = 300,
        trigger 
    } = config
    
    const animations = {
        fadeIn: [
            { opacity: 0, transform: 'translateY(10px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ],
        fadeOut: [
            { opacity: 1, transform: 'translateY(0)' },
            { opacity: 0, transform: 'translateY(-10px)' }
        ],
        slideIn: [
            { transform: 'translateX(-100%)' },
            { transform: 'translateX(0)' }
        ],
        slideOut: [
            { transform: 'translateX(0)' },
            { transform: 'translateX(100%)' }
        ]
    }
    
    if (trigger) {
        return effect(() => {
            const shouldShow = ensureValue(trigger, context)
            const keyframes = shouldShow ? animations[enter] : animations[exit]
            
            el.animate(keyframes, { 
                duration, 
                fill: 'forwards',
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
            })
        })
    }
    
    return () => {} // No cleanup needed for one-time animations
}

// 7. LOCAL STORAGE SYNC
function bindStorage(el, config, context) {
    const { key, storage = 'localStorage' } = config
    const store = window[storage]
    
    // Load from storage
    try {
        const saved = store.getItem(key)
        if (saved && context[key] === undefined) {
            context[key] = JSON.parse(saved)
        }
    } catch (error) {
        console.warn('Failed to load from storage:', error)
    }
    
    // Watch for changes and save
    return watch(
        () => context[key], 
        (newValue) => {
            try {
                store.setItem(key, JSON.stringify(newValue))
            } catch (error) {
                console.warn('Failed to save to storage:', error)
            }
        }
    )
}

// =============================================
// ERWEITERTE bindProp FUNKTION
// =============================================

export function bindProp(el, props, key, context) {
    const value = props[key]

    switch (key) {
        // Existing cases...
        case "model":
            // ... existing model binding logic
            break
            
        // New QoL features:
        case "outside":
            return bindOutside(el, value, context)
            
        case "http":
            return bindHttp(el, value, context)
            
        case "intersect":
            return bindIntersect(el, value, context)
            
        case "resize": 
            return bindResize(el, value, context)
            
        case "keyboard":
            return bindKeyboard(el, value, context)
            
        case "animate":
            return bindAnimate(el, value, context)
            
        case "storage":
            return bindStorage(el, value, context)
            
        // Shorthand für häufige Patterns:
        case "toggle":
            // Shorthand für onClick toggle
            return effect(() => {
                el.addEventListener('click', () => {
                    const path = value.split('.')
                    const currentValue = getNestedValue(context, path)
                    setNestedValue(context, [...path], !currentValue)
                })
            })
            
        case "class":
            // Dynamic classes
            return effect(() => {
                const classes = ensureValue(value, context)
                if (typeof classes === 'object') {
                    Object.entries(classes).forEach(([className, condition]) => {
                        const shouldAdd = ensureValue(condition, context)
                        el.classList.toggle(className, shouldAdd)
                    })
                } else {
                    el.className = classes || ''
                }
            })
            
        // ... existing default case
    }
}

// =============================================
// USAGE EXAMPLES
// =============================================

V.component({
    $ctx: { 
        showModal: false,
        user: { name: '' },
        todos: []
    },
    
    // Outside clicks
    "#modal": {
        show: (ctx) => ctx.showModal,
        outside: (ctx) => ctx.showModal = false
    },
    
    // HTMX-style requests
    "#load-data": {
        http: {
            url: '/api/data',
            method: 'GET',
            trigger: 'click',
            target: '#results'
        }
    },
    
    // Intersection observer
    "#lazy-image": {
        intersect: (ctx, entry) => {
            if (entry.isIntersecting) {
                entry.target.src = entry.target.dataset.src
            }
        }
    },
    
    // Keyboard shortcuts
    "#app": {
        keyboard: {
            keys: ['ctrl+s', 'ctrl+enter'],
            handler: (ctx, event) => {
                if (event.key === 's') ctx.save()
                if (event.key === 'Enter') ctx.submit()
            },
            global: true
        }
    },
    
    // Animations
    "#notification": {
        animate: {
            enter: 'slideIn',
            exit: 'fadeOut',
            trigger: (ctx) => ctx.showNotification
        }
    },
    
    // Storage sync
    "#app": {
        storage: { key: 'todos' }
    },
    
    // Dynamic classes
    "#button": {
        class: {
            'btn-primary': (ctx) => !ctx.loading,
            'btn-loading': (ctx) => ctx.loading,
            'btn-disabled': (ctx) => ctx.disabled
        }
    },
    
    // Toggle shorthand
    "#theme-toggle": {
        toggle: "darkMode"
    }
})