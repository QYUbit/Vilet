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
    return effect(() => {
      const shouldShow = getReactiveValue(value);
      const showEl = el;
      if (showEl._shouldShow === shouldShow) return;
      showEl._shouldShow = shouldShow;
      el.style.display = shouldShow ? "block" : "none";
    });
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
    if (!el._originalStyle) {
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
    const effectCleanup = effect(() => {
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
    return () => {
      effectCleanup();
      cleanup.forEach((fn) => fn());
    };
  }
  function bindFor(el, value, config) {
    const templates = /* @__PURE__ */ new Map();
    const cleanup = /* @__PURE__ */ new Map();
    const itemKeyMap = /* @__PURE__ */ new WeakMap();
    let keyCounter = 0;
    const effectCleanup = effect(() => {
      const arr = getReactiveValue(value);
      if (!Array.isArray(arr)) return;
      const newKeys = arr.map((item, i) => {
        if (config.$key) {
          return config.$key(item, i);
        }
        if (isObject(item)) {
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
          if (!config.$each) throw new Error("required $each binding is missing for $for binding");
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
    return () => {
      effectCleanup();
      cleanup.forEach((temp) => temp.forEach((fn) => fn()));
    };
  }
  function getReturnValues(values, bindingName) {
    if (!values) return [null, []];
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
    if (!isObject(config)) return;
    const root = config.$root ?? document;
    const el = config.$element ?? config.$el ?? root.querySelector(config.$selector ?? config.$select ?? config.$ ?? "");
    if (!el) {
      return;
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

  // packages/store/src/index.ts
  function store(ref2, options) {
    const storageStr = options.storage || "localStorage";
    if (!(storageStr in window)) {
      console.warn(`Cannot use store plugin, since ${storageStr} is not available`);
      return;
    }
    const storage = window[storageStr];
    const initial = storage.getItem(options.key);
    if (initial) {
      if (options.onload) {
        options.onload(JSON.parse(initial));
      } else {
        console.log(`Load store: ${initial}`);
        ref2.value = JSON.parse(initial);
      }
    }
    effect(() => {
      console.log(`Store effect: ${ref2.value}`);
      storage.setItem(options.key, JSON.stringify(ref2.value));
    });
  }

  // examples/store_example/example.ts
  function Counter() {
    const count = ref(0);
    store(count, { key: "counter_count" });
    element({
      $selector: "#counter-button",
      onClick: () => count.value++
    });
    element({
      $selector: "#counter-display",
      textContent: count
    });
  }
  function TodoList() {
    const todos = ref([]);
    const currentTitle = ref("");
    effect(() => console.log(`Todo change: ${JSON.stringify(todos.value)}`));
    store(todos, { key: "todolist_todos" });
    store(currentTitle, { key: "todo_title_input", storage: "sessionStorage" });
    element({
      $selector: "#container",
      // Observe todos
      $for: todos,
      // Use item.id as key
      $key: (item) => item.id,
      // Execute this callback for each todo
      $each: (item) => {
        const template = clone("#todo-template");
        if (!template) return [];
        const el1 = element({
          $root: template.fragment,
          $selector: "#card",
          // Listen to clicks on this element
          onclick: () => {
            todos.value = todos.value.filter((todo) => todo.id !== item.id);
          }
        });
        const el2 = element({
          $root: template.fragment,
          $selector: "#title",
          // Bind text content to item.title
          textContent: item.title
        });
        return [template, el1, el2];
      }
    });
    element({
      $selector: "#title-input",
      value: currentTitle,
      oninput: (e) => {
        currentTitle.value = e.target?.value;
      }
    });
    element({
      $selector: "#add-button",
      onclick: () => {
        todos.value.push({
          id: crypto.randomUUID(),
          title: currentTitle.value
        });
        currentTitle.value = "";
      }
    });
  }
  Counter();
  TodoList();
})();
