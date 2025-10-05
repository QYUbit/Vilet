(() => {
  // packages/core/src/scheduler.ts
  var flushPending = false;
  var flushing = false;
  var queue = [];
  var lastFlushedIndex = -1;
  function scheduler(callback) {
    queueJob(callback);
  }
  function queueJob(job) {
    if (!queue.includes(job)) queue.push(job);
    queueFlush();
  }
  function queueFlush() {
    if (!flushing && !flushPending) {
      flushPending = true;
      queueMicrotask(flushJobs);
    }
  }
  function flushJobs() {
    flushPending = false;
    flushing = true;
    for (let i = 0; i < queue.length; i++) {
      queue[i]();
      lastFlushedIndex = i;
    }
    queue.length = 0;
    lastFlushedIndex = -1;
    flushing = false;
  }

  // packages/core/src/reactivity.ts
  var arrayMethods = ["push", "pop", "shift", "unshift", "splice", "sort", "reverse"];
  var currentEffect = null;
  var targetMap = /* @__PURE__ */ new WeakMap();
  function track(target, key) {
    if (!currentEffect) return;
    console.log(`Tracking key "${String(key)}"`);
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
    }
    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(key, dep = /* @__PURE__ */ new Set());
    }
    dep.add(currentEffect);
    currentEffect.deps.add(dep);
  }
  function trigger(target, key) {
    const depsMap = targetMap.get(target);
    if (!depsMap) return;
    console.log(`Trigering dependencies of key "${String(key)}"`);
    const dep = depsMap.get(key);
    if (dep) {
      dep.forEach((effect2) => scheduler(effect2));
    }
  }
  function reactive(target) {
    if (typeof target !== "object" || target === null) {
      return target;
    }
    if (target.__isReactive) {
      return target;
    }
    return new Proxy(target, {
      get(target2, key, receiver) {
        if (key === "__isReactive") {
          return true;
        }
        const result = Reflect.get(target2, key, receiver);
        if (!(Array.isArray(target2) && arrayMethods.includes(key))) {
          track(target2, key);
        }
        if (Array.isArray(target2) && arrayMethods.includes(key)) {
          return (...args) => {
            const oldLength = target2.length;
            const _result = result.apply(target2, args);
            if (target2.length !== oldLength) {
              trigger(target2, "length");
            }
            trigger(target2, key);
            return _result;
          };
        }
        if (typeof result === "object" && result !== null) {
          return reactive(result);
        }
        return result;
      },
      set(target2, key, value, receiver) {
        const oldValue = Reflect.get(target2, key, receiver);
        const result = Reflect.set(target2, key, value, receiver);
        if (value !== oldValue) {
          trigger(target2, key);
          if (Array.isArray(target2) && key !== "length" && !isNaN(Number(key))) {
            const index = Number(key);
            if (index >= target2.length - 1) {
              trigger(target2, "length");
            }
          }
        }
        return result;
      },
      deleteProperty(target2, key) {
        const result = Reflect.deleteProperty(target2, key);
        trigger(target2, key);
        return result;
      }
    });
  }
  function effect(fn) {
    const effectFunc = () => {
      const newDeps = /* @__PURE__ */ new Set();
      const oldDeps = effectFunc.deps;
      effectFunc.deps = newDeps;
      const prevEffect = currentEffect;
      currentEffect = effectFunc;
      try {
        fn();
      } finally {
        currentEffect = prevEffect;
      }
      oldDeps.forEach((dep) => {
        if (!effectFunc.deps.has(dep)) {
          dep.delete(effectFunc);
        }
      });
    };
    effectFunc.deps = /* @__PURE__ */ new Set();
    effectFunc();
    return () => {
      effectFunc.deps.forEach((dep) => dep.delete(effectFunc));
      effectFunc.deps.clear();
    };
  }
  function ref(value) {
    if (isRef(value)) {
      return value;
    }
    const refImpl = {
      __isRef: true,
      _value: value,
      get value() {
        track(refImpl, "value");
        return this._value;
      },
      set value(newValue) {
        if (newValue !== this._value) {
          if (Array.isArray(newValue)) {
            const reactiveArray = reactive([...newValue]);
            this._value = new Proxy(reactiveArray, {
              get(target, key, receiver) {
                const result = Reflect.get(target, key, receiver);
                if (typeof result === "function" && arrayMethods.includes(key)) {
                  return function(...args) {
                    const res = result.apply(this, args);
                    trigger(refImpl, "value");
                    return res;
                  };
                }
                return result;
              },
              set(target, key, newVal, receiver) {
                const result = Reflect.set(target, key, newVal, receiver);
                if (!isNaN(Number(key))) {
                  trigger(refImpl, "value");
                }
                return result;
              }
            });
          } else {
            this._value = newValue;
          }
          trigger(refImpl, "value");
        }
      }
    };
    if (Array.isArray(value)) {
      const reactiveArray = reactive([...value]);
      refImpl._value = new Proxy(reactiveArray, {
        get(target, key, receiver) {
          const result = Reflect.get(target, key, receiver);
          if (typeof result === "function" && arrayMethods.includes(key)) {
            return function(...args) {
              const res = result.apply(this, args);
              trigger(refImpl, "value");
              return res;
            };
          }
          return result;
        },
        set(target, key, newValue, receiver) {
          const result = Reflect.set(target, key, newValue, receiver);
          if (!isNaN(Number(key))) {
            trigger(refImpl, "value");
          }
          return result;
        }
      });
    } else if (typeof value === "object" && value !== null) {
      refImpl._value = reactive(value);
    }
    return refImpl;
  }
  function isRef(value) {
    return !!(value && value.__isRef === true);
  }

  // packages/core/src/utils.ts
  function isObject(value) {
    return typeof value === "object" && value !== null;
  }
  function isFunction(value) {
    return typeof value === "function";
  }
  function getReactiveValue(value) {
    if (isRef(value)) {
      return value.value;
    }
    if (isFunction(value)) {
      return value();
    }
    return value;
  }

  // packages/core/src/bind.ts
  var specialBindings = /* @__PURE__ */ new Map();
  function registerBinding(name, handler) {
    specialBindings.set(name, handler);
  }
  function bindProp(el, key, value, config) {
    const handler = specialBindings.get(key);
    if (handler) {
      return handler(el, value, config);
    }
    if (key.startsWith("on") && isFunction(value)) {
      const eventName = key.slice(2).toLowerCase();
      const listener = (e) => value(e, el);
      el.addEventListener(eventName, listener);
      return () => el.removeEventListener(eventName, listener);
    }
    if (!key.startsWith("_") && !key.startsWith("$")) {
      return effect(() => {
        const val = getReactiveValue(value);
        if (el[key] !== val) {
          el[key] = val;
        }
      });
    }
  }

  // packages/core/src/bindings.ts
  function initBindings() {
    registerBinding("$text", bindText);
    registerBinding("$show", bindShow);
    registerBinding("$class", bindClass);
    registerBinding("$style", bindStyle);
    registerBinding("$template", bindTemplate);
    registerBinding("$for", bindFor);
    registerBinding("$if", () => {
    });
    registerBinding("$each", () => {
    });
    registerBinding("$key", () => {
    });
  }
  function bindText(el, value) {
    effect(() => {
      const val = getReactiveValue(value);
      const textContent = String(val);
      if (el.textContent !== textContent) {
        el.textContent = textContent;
      }
    });
  }
  function bindShow(el, value) {
    effect(() => {
      let shouldShow;
      let delay = 0;
      if (isShowConfig(value)) {
        shouldShow = getReactiveValue(value.value);
        delay = value.hideDelay || 0;
      } else {
        shouldShow = getReactiveValue(value);
      }
      const showEl = el;
      if (showEl._shouldShow === shouldShow) return;
      if (!shouldShow && delay > 0) {
        showEl._shouldShow = false;
        setTimeout(() => {
          el.style.display = "none";
        }, delay);
      } else {
        showEl._shouldShow = shouldShow;
        el.style.display = shouldShow ? "block" : "none";
      }
    });
  }
  function isShowConfig(value) {
    return typeof value === "object" && value !== null && "value" in value;
  }
  function bindClass(element2, value) {
    const el = element2;
    if (!el._originalClasses) {
      el._originalClasses = new Set(Array.from(el.classList));
    }
    return effect(() => {
      const dynamicClasses = getReactiveValue(value);
      if (el._viletClasses) {
        el._viletClasses.forEach((cls) => el.classList.remove(cls));
      }
      const newClasses = /* @__PURE__ */ new Set();
      if (typeof dynamicClasses === "string") {
        dynamicClasses.split(/\s+/).forEach((cls) => {
          if (cls.trim()) newClasses.add(cls.trim());
        });
      } else if (Array.isArray(dynamicClasses)) {
        dynamicClasses.forEach((cls) => {
          if (typeof cls === "string") {
            newClasses.add(cls);
          } else if (isObject(cls)) {
            Object.entries(cls).forEach(([className, condition]) => {
              if (getReactiveValue(condition)) {
                newClasses.add(className);
              }
            });
          }
        });
      } else if (isObject(dynamicClasses)) {
        Object.entries(dynamicClasses).forEach(([className, condition]) => {
          if (getReactiveValue(condition)) {
            newClasses.add(className);
          }
        });
      }
      newClasses.forEach((cls) => el.classList.add(cls));
      el._viletClasses = newClasses;
    });
  }
  function bindStyle(element2, value) {
    const el = element2;
    if (el._originalStyle === void 0) {
      el._originalStyle = el.getAttribute("style") || "";
    }
    return effect(() => {
      const dynamicStyles = getReactiveValue(value);
      if (el._viletStyles) {
        Object.keys(el._viletStyles).forEach((prop) => {
          el.style.removeProperty(prop);
        });
      }
      if (el._originalStyle) {
        el.setAttribute("style", el._originalStyle);
      } else {
        el.removeAttribute("style");
      }
      const newStyles = {};
      if (typeof dynamicStyles === "string") {
        const cssString = dynamicStyles.trim();
        if (cssString) {
          const currentStyle = el.getAttribute("style") || "";
          const separator = currentStyle && !currentStyle.endsWith(";") ? "; " : "";
          const finalCssString = cssString.endsWith(";") ? cssString : cssString + ";";
          el.setAttribute("style", currentStyle + separator + finalCssString);
          parseCssString(finalCssString, newStyles);
        }
      } else if (isObject(dynamicStyles)) {
        Object.entries(dynamicStyles).forEach(([property, styleValue]) => {
          const finalValue = getReactiveValue(styleValue);
          if (finalValue != null) {
            const cssProperty = camelToKebab(property);
            el.style.setProperty(cssProperty, String(finalValue));
            newStyles[cssProperty] = String(finalValue);
          }
        });
      }
      el._viletStyles = newStyles;
    });
  }
  function camelToKebab(str) {
    return str.replace(/([A-Z])/g, "-$1").toLowerCase();
  }
  function parseCssString(cssString, styles) {
    const rules = cssString.split(";").filter((rule) => rule.trim());
    rules.forEach((rule) => {
      const colonIndex = rule.indexOf(":");
      if (colonIndex > 0) {
        const property = rule.substring(0, colonIndex).trim();
        const value = rule.substring(colonIndex + 1).trim();
        if (property && value) {
          styles[property] = value;
        }
      }
    });
  }
  function bindTemplate(el, value, config) {
    let show = false;
    let _template = null;
    let cleanup = [];
    return effect(() => {
      const shouldShow = config.$if ? getReactiveValue(config.$if) : true;
      const [template, cleanupFns] = getReturnValues(getReactiveValue(value), "$template");
      const templateChanged = _template?.id !== template?.id;
      const showChanged = shouldShow !== show;
      if (templateChanged || !shouldShow && showChanged) {
        _template?.unmount(el);
        cleanup.forEach((fn) => fn());
        _template = null;
        cleanup = [];
      }
      if (templateChanged || shouldShow && showChanged) {
        if (!template) return;
        template.mount(el);
        _template = template;
        cleanup = cleanupFns;
      }
    });
  }
  function bindFor(el, value, config) {
    const templates = /* @__PURE__ */ new Map();
    const cleanup = /* @__PURE__ */ new Map();
    const itemKeyMap = /* @__PURE__ */ new WeakMap();
    let keyCounter = 0;
    return effect(() => {
      const arr = getReactiveValue(value);
      if (!Array.isArray(arr)) return;
      const newKeys = arr.map((item, i) => {
        if (config.$key) {
          return config.$key(item, i);
        }
        if (typeof item === "object" && item !== null) {
          if (!itemKeyMap.has(item)) {
            itemKeyMap.set(item, `obj_${keyCounter++}`);
          }
          return itemKeyMap.get(item);
        } else {
          return `${item}_${i}`;
        }
      });
      const existingKeys = Array.from(templates.keys());
      const keysToRemove = existingKeys.filter((key) => !newKeys.includes(key));
      keysToRemove.forEach((key) => {
        const template = templates.get(key);
        if (template) {
          template.unmount(el);
          templates.delete(key);
        }
        const cleanupFns = cleanup.get(key);
        if (cleanupFns && cleanupFns.length > 0) {
          cleanupFns.forEach((fn) => fn());
          cleanup.delete(key);
        }
      });
      newKeys.forEach((key, i) => {
        if (!templates.has(key)) {
          if (config.$each === void 0) throw new Error("required $each binding is missing for $for binding");
          const [template, cleanupFns] = getReturnValues(config.$each(arr[i], i), "$each");
          if (!template) return;
          template.mount(el);
          templates.set(key, template);
          cleanup.set(key, cleanupFns);
        }
      });
      newKeys.forEach((key, index) => {
        const template = templates.get(key);
        if (template?.elements?.length) {
          const firstElement = template.elements[0];
          const currentPosition = Array.from(el.children).indexOf(firstElement);
          if (currentPosition !== index && currentPosition !== -1) {
            template.elements.forEach((element2) => {
              if (index >= el.children.length) {
                el.appendChild(element2);
              } else {
                el.insertBefore(element2, el.children[index]);
              }
            });
          }
        }
      });
    });
  }
  function getReturnValues(values, bindingName) {
    let template = null;
    let cleanupFns = [];
    values.forEach((value) => {
      if (!value) return;
      if ("mounted" in value) {
        if (template) {
          console.warn(`${bindingName} must not return more than one templateRef`);
          return;
        }
        template = value;
      } else {
        cleanupFns.push(...value.cleanup);
      }
    });
    if (!template) {
      console.error(`${bindingName} has to return a templateRef`);
    }
    return [template, cleanupFns];
  }

  // packages/core/src/element.ts
  function element(config) {
    if (!isObject(config)) return null;
    const root = config.$root ?? document;
    const el = config.$element ?? config.$el ?? root.querySelector(config.$selector ?? config.$select ?? config.$ ?? "");
    if (!el) {
      return null;
    }
    const cleanupFns = [];
    for (const [key, value] of Object.entries(config)) {
      const cleanup = bindProp(el, key, value, config);
      if (isFunction(cleanup)) {
        cleanupFns.push(cleanup);
      }
    }
    return {
      element: el,
      cleanup: cleanupFns,
      destroy() {
        this.cleanup.forEach((fn) => fn());
      }
    };
  }

  // packages/core/src/template.ts
  function clone(selector) {
    const template = document.querySelector(selector);
    if (!template || !(template instanceof HTMLTemplateElement)) return null;
    const clone2 = template.content.cloneNode(true);
    const templateRef = {
      id: crypto.randomUUID(),
      mounted: false,
      elements: [],
      fragment: clone2,
      mount(el) {
        this.elements = Array.from(clone2.childNodes);
        this.mounted = true;
        el.appendChild(clone2);
      },
      unmount(el) {
        this.mounted = false;
        this.elements.forEach((element2) => {
          if (element2.parentNode === el) {
            el.removeChild(element2);
          }
        });
        this.elements = [];
      }
    };
    return templateRef;
  }

  // packages/core/src/index.ts
  initBindings();

  // packages/navigation/src/index.ts
  var NavigationImpl = class {
    currentRoute;
    routes;
    guards = [];
    afterHooks = [];
    isNavigating = false;
    constructor(routes) {
      this.routes = routes;
      this.currentRoute = ref({
        path: "/",
        params: {},
        query: {},
        hash: ""
      });
      this.init();
    }
    init() {
      window.addEventListener("hashchange", () => this.handleRouteChange());
      window.addEventListener("load", () => this.handleRouteChange());
      this.handleRouteChange();
    }
    async handleRouteChange() {
      if (this.isNavigating) return;
      const hash = window.location.hash.slice(1) || "/";
      const [pathWithQuery, hashFragment] = hash.split("#");
      const [path, queryString] = pathWithQuery.split("?");
      const newLocation = {
        path: path || "/",
        params: {},
        query: this.parseQuery(queryString || ""),
        hash: hashFragment || ""
      };
      const matched = this.matchRoute(newLocation.path);
      if (matched) {
        newLocation.params = matched.params;
        const canNavigate = await this.runGuards(newLocation, this.currentRoute.value);
        if (canNavigate) {
          const oldRoute = this.currentRoute.value;
          this.currentRoute.value = newLocation;
          this.runAfterHooks(newLocation, oldRoute);
        } else {
          this.isNavigating = true;
          window.location.hash = this.buildHash(this.currentRoute.value);
          this.isNavigating = false;
        }
      } else {
        console.warn(`No route matched for path: ${newLocation.path}`);
      }
    }
    matchRoute(path, routes = this.routes, parentPath = "") {
      for (const route of routes) {
        const fullPath = this.joinPaths(parentPath, route.path);
        const match = this.matchPath(fullPath, path);
        if (match) {
          return { route, params: match };
        }
        if (route.children) {
          const childMatch = this.matchRoute(path, route.children, fullPath);
          if (childMatch) return childMatch;
        }
      }
      return null;
    }
    matchPath(routePath, actualPath) {
      const routeSegments = routePath.split("/").filter(Boolean);
      const pathSegments = actualPath.split("/").filter(Boolean);
      if (routeSegments.length !== pathSegments.length) {
        return null;
      }
      const params = {};
      for (let i = 0; i < routeSegments.length; i++) {
        const routeSegment = routeSegments[i];
        const pathSegment = pathSegments[i];
        if (routeSegment.startsWith(":")) {
          const paramName = routeSegment.slice(1);
          params[paramName] = pathSegment;
        } else if (routeSegment !== pathSegment) {
          return null;
        }
      }
      return params;
    }
    joinPaths(...paths) {
      return "/" + paths.join("/").split("/").filter(Boolean).join("/");
    }
    parseQuery(queryString) {
      const query = {};
      if (!queryString) return query;
      queryString.split("&").forEach((param) => {
        const [key, value] = param.split("=");
        if (key) {
          query[decodeURIComponent(key)] = decodeURIComponent(value || "");
        }
      });
      return query;
    }
    buildQuery(query) {
      const params = Object.entries(query).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&");
      return params ? `?${params}` : "";
    }
    buildHash(location) {
      let hash = `#${location.path}`;
      if (Object.keys(location.query).length > 0) {
        hash += this.buildQuery(location.query);
      }
      if (location.hash) {
        hash += `#${location.hash}`;
      }
      return hash;
    }
    async runGuards(to, from) {
      const matched = this.matchRoute(to.path);
      if (matched?.route.beforeEnter) {
        const result = await matched.route.beforeEnter({ to, from });
        if (!result) return false;
      }
      for (const guard of this.guards) {
        const result = await guard({ to, from });
        if (!result) return false;
      }
      return true;
    }
    runAfterHooks(to, from) {
      this.afterHooks.forEach((hook) => hook(to, from));
    }
    async push(path, options = {}) {
      this.isNavigating = true;
      const location = {
        path,
        params: {},
        query: options.query || {},
        hash: options.hash || ""
      };
      window.location.hash = this.buildHash(location);
      this.isNavigating = false;
    }
    async replace(path, options = {}) {
      this.isNavigating = true;
      const location = {
        path,
        params: {},
        query: options.query || {},
        hash: options.hash || ""
      };
      window.location.replace(this.buildHash(location));
      this.isNavigating = false;
    }
    back() {
      window.history.back();
    }
    forward() {
      window.history.forward();
    }
    go(delta) {
      window.history.go(delta);
    }
    beforeEach(guard) {
      this.guards.push(guard);
      return () => {
        const index = this.guards.indexOf(guard);
        if (index > -1) {
          this.guards.splice(index, 1);
        }
      };
    }
    afterEach(callback) {
      this.afterHooks.push(callback);
      return () => {
        const index = this.afterHooks.indexOf(callback);
        if (index > -1) {
          this.afterHooks.splice(index, 1);
        }
      };
    }
    addRoute(route) {
      this.routes.push(route);
    }
    removeRoute(name) {
      const index = this.routes.findIndex((r) => r.name === name);
      if (index > -1) {
        this.routes.splice(index, 1);
      }
    }
    hasRoute(name) {
      return this.routes.some((r) => r.name === name);
    }
    getRoutes() {
      return [...this.routes];
    }
    resolve(path) {
      const matched = this.matchRoute(path);
      if (!matched) return null;
      return {
        path,
        params: matched.params,
        query: {},
        hash: ""
      };
    }
  };
  function createNavigation(routes) {
    return new NavigationImpl(routes);
  }
  function getMatchedComponent(router2) {
    const currentPath = router2.currentRoute.value.path;
    function findComponent(routes, path, parentPath = "") {
      for (const route of routes) {
        const fullPath = "/" + [parentPath, route.path].join("/").split("/").filter(Boolean).join("/");
        const match = matchPath(fullPath, path);
        if (match) {
          if (route.redirect) {
            return findComponent(routes, route.redirect);
          }
          return route.component || null;
        }
        if (route.children) {
          const childComponent = findComponent(route.children, path, fullPath);
          if (childComponent) return childComponent;
        }
      }
      return null;
    }
    function matchPath(routePath, actualPath) {
      const routeSegments = routePath.split("/").filter(Boolean);
      const pathSegments = actualPath.split("/").filter(Boolean);
      if (routeSegments.length !== pathSegments.length) {
        return false;
      }
      for (let i = 0; i < routeSegments.length; i++) {
        const routeSegment = routeSegments[i];
        const pathSegment = pathSegments[i];
        if (!routeSegment.startsWith(":") && routeSegment !== pathSegment) {
          return false;
        }
      }
      return true;
    }
    return findComponent(router2.routes, currentPath);
  }

  // examples/navigation_sample/navigation.ts
  var isAuthenticated = ref(false);
  function AdminLayout() {
    const template = clone("#admin-layout-template");
    if (!template) throw new Error("#admin-layout-template not found");
    const navLinks = [
      { text: "Dashboard", path: "/admin/dashboard" },
      { text: "Users", path: "/admin/users" },
      { text: "Settings", path: "/admin/settings" }
    ];
    const navContainer = template.fragment.querySelector("#admin-nav");
    if (navContainer) {
      navLinks.forEach((link) => {
        const a = document.createElement("a");
        a.textContent = link.text;
        a.onclick = () => router.push(link.path);
        navContainer.appendChild(a);
      });
    }
    element({
      $root: template.fragment,
      $selector: "#admin-content",
      $template: () => {
        const component = getMatchedComponent(router);
        return component ? component() : [];
      }
    });
    return [template];
  }
  function DashboardPage() {
    const template = clone("#dashboard-template");
    if (!template) throw new Error("#dashboard-template not found");
    element({
      $root: template.fragment,
      $selector: "#dashboard-title",
      textContent: "Admin Dashboard"
    });
    return [template];
  }
  function AdminUsersPage() {
    const template = clone("#admin-users-template");
    if (!template) throw new Error("#admin-users-template not found");
    element({
      $root: template.fragment,
      $selector: "#users-list",
      textContent: "List of users..."
    });
    return [template];
  }
  function AdminSettingsPage() {
    const template = clone("#admin-settings-template");
    if (!template) throw new Error("#admin-settings-template not found");
    element({
      $root: template.fragment,
      $selector: "#settings-form",
      textContent: "Settings form..."
    });
    return [template];
  }
  function LoginPage() {
    const template = clone("#login-template");
    if (!template) throw new Error("#login-template not found");
    element({
      $root: template.fragment,
      $selector: "#login-button",
      onclick: () => {
        isAuthenticated.value = true;
        router.push("/admin");
      }
    });
    return [template];
  }
  var router = createNavigation([
    {
      path: "/",
      name: "home",
      component: () => {
        const template = clone("#home-simple-template");
        if (!template) throw new Error("#home-simple-template not found");
        return [template];
      }
    },
    {
      path: "/login",
      name: "login",
      component: LoginPage,
      meta: { requiresGuest: true }
    },
    {
      path: "/admin",
      name: "admin",
      component: AdminLayout,
      meta: { requiresAuth: true },
      beforeEnter: ({ to, from }) => {
        console.log("Admin beforeEnter guard");
        if (!isAuthenticated.value) {
          console.log("Not authenticated, redirecting to login");
          router.push("/login");
          return false;
        }
        return true;
      },
      children: [
        {
          path: "",
          redirect: "/admin/dashboard"
        },
        {
          path: "dashboard",
          name: "admin-dashboard",
          component: DashboardPage,
          meta: { requiresAuth: true }
        },
        {
          path: "users",
          name: "admin-users",
          component: AdminUsersPage,
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: "settings",
          name: "admin-settings",
          component: AdminSettingsPage,
          meta: { requiresAuth: true }
        }
      ]
    },
    {
      path: "/profile/:userId",
      name: "profile",
      component: () => {
        const template = clone("#profile-template");
        if (!template) throw new Error("#profile-template not found");
        const userId = router.currentRoute.value.params.userId;
        element({
          $root: template.fragment,
          $selector: "#profile-id",
          textContent: `Viewing profile: ${userId}`
        });
        return [template];
      },
      beforeEnter: async ({ to, from }) => {
        console.log(`Validating user ${to.params.userId}...`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (to.params.userId === "999") {
          console.log("User not found");
          router.push("/");
          return false;
        }
        return true;
      }
    }
  ]);
  router.beforeEach(({ to, from }) => {
    console.log(`Global beforeEach: ${from.path} -> ${to.path}`);
    const matched = findMatchedRoute(to.path);
    if (matched?.meta?.requiresAuth && !isAuthenticated.value) {
      console.log("Route requires authentication");
      router.push("/login");
      return false;
    }
    if (matched?.meta?.requiresGuest && isAuthenticated.value) {
      console.log("Already authenticated");
      router.push("/admin");
      return false;
    }
    return true;
  });
  function findMatchedRoute(path) {
    function search(routes, parentPath = "") {
      for (const route of routes) {
        const fullPath = parentPath + route.path;
        if (matchesPath(fullPath, path)) {
          return route;
        }
        if (route.children) {
          const child = search(route.children, fullPath);
          if (child) return child;
        }
      }
      return null;
    }
    return search(router.getRoutes());
  }
  function matchesPath(pattern, path) {
    const patternParts = pattern.split("/").filter(Boolean);
    const pathParts = path.split("/").filter(Boolean);
    if (patternParts.length !== pathParts.length) return false;
    for (let i = 0; i < patternParts.length; i++) {
      if (!patternParts[i].startsWith(":") && patternParts[i] !== pathParts[i]) {
        return false;
      }
    }
    return true;
  }
  router.afterEach((to, from) => {
    console.log(`Navigation completed: ${from.path} -> ${to.path}`);
    if (to.path) {
      document.title = `App - ${to.path}`;
    }
    console.log("Track page view:", to.path);
  });
  element({
    $selector: "#app-router-view",
    $template: () => {
      const component = getMatchedComponent(router);
      if (component) {
        return component();
      }
      return [];
    }
  });
  element({
    $selector: "#nav-home",
    onclick: () => router.push("/")
  });
  element({
    $selector: "#nav-admin",
    onclick: () => router.push("/admin")
  });
  element({
    $selector: "#nav-profile",
    onclick: () => router.push("/profile/123")
  });
  element({
    $selector: "#nav-login",
    onclick: () => router.push("/login")
  });
  element({
    $selector: "#logout-button",
    onclick: () => {
      isAuthenticated.value = false;
      router.push("/login");
    }
  });
  element({
    $selector: "#auth-status",
    textContent: () => isAuthenticated.value ? "Logged In" : "Logged Out"
  });
  element({
    $selector: "#auth-actions",
    style: () => ({ display: isAuthenticated.value ? "inline" : "none" })
  });
  element({
    $selector: "#search-button",
    onclick: () => {
      router.push("/search", {
        query: {
          q: "typescript",
          page: "1",
          sort: "relevance"
        }
      });
    }
  });
  element({
    $selector: "#section-link",
    onclick: () => {
      router.push("/docs", {
        hash: "section-2"
      });
    }
  });
})();
