import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { z } from "zod";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface Options {
  initialPath?: string;
}

/**
 * Render a component as the leaf of a real TanStack Router tree, with a
 * fresh QueryClient per test. Routes match the production tree so that
 * <Link to="/search"> typechecks and resolves.
 */
export function renderWithRouter(node: ReactNode, opts: Options = {}) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <>{node}</>,
  });
  const searchRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/search",
    component: () => <>{node}</>,
  });
  const recipeNewRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/recipes/new",
    validateSearch: z.object({ seed: z.number().int().positive().optional() }),
    component: () => <>{node}</>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, searchRoute, recipeNewRoute]),
    history: createMemoryHistory({ initialEntries: [opts.initialPath ?? "/"] }),
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
