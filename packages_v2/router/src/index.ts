export type RouteHandler = (params: Record<string, string>) => void;
export type RoutePattern = string | RegExp;

export interface Route {
  pattern: RoutePattern;
  handler: RouteHandler;
  regex?: RegExp;
  keys?: string[];
}

export const createRouter = () => {
  const routes: Route[] = [];
  let notFoundHandler: (() => void) | undefined;

  const handleRoute = (): void => {
    const path = window.location.pathname;

    for (const route of routes) {
      if (route.pattern instanceof RegExp) {
        const match = path.match(route.pattern);
        if (match) {
          route.handler({});
          return;
        }
      } else if (route.regex) {
        const match = path.match(route.regex);
        if (match) {
          const params: Record<string, string> = {};
          route.keys?.forEach((key, i) => {
            params[key] = match[i + 1];
          });
          route.handler(params);
          return;
        }
      }
    }

    notFoundHandler?.();
  };

  return {
    on: (pattern: RoutePattern, handler: RouteHandler) => {
      const route: Route = { pattern, handler };

      if (typeof pattern === 'string') {
        const keys: string[] = [];
        const regexPattern = pattern
          .replace(/\//g, '\\/')
          .replace(/:(\w+)/g, (_, key) => {
            keys.push(key);
            return '([^/]+)';
          });
        
        route.regex = new RegExp(`^${regexPattern}$`);
        route.keys = keys;
      }

      routes.push(route);
    },

    notFound: (handler: () => void) => {
      notFoundHandler = handler;
    },

    navigate: (path: string) => {
      window.history.pushState({}, '', path);
      handleRoute();
    },

    replace: (path: string) => {
      window.history.replaceState({}, '', path);
      handleRoute();
    },

    back: () => {
      window.history.back();
    },

    forward: () => {
      window.history.forward();
    },

    start: () => {
      window.addEventListener('popstate', handleRoute);
      handleRoute();
    }
  };
};
