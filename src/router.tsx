import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { z } from "zod";
import { App } from "./App";
import { SearchScreen } from "./routes/search";
import { RecipeEditScreen, RecipeNewScreen } from "./routes/recipeRoutes";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: App,
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  component: SearchScreen,
});

const recipeNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recipes/new",
  validateSearch: z.object({ seed: z.number().int().positive().optional() }),
  component: RecipeNewScreen,
});

const recipeEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recipes/$recipeId",
  parseParams: (params) => ({ recipeId: Number(params.recipeId) }),
  stringifyParams: (params) => ({ recipeId: String(params.recipeId) }),
  component: RecipeEditScreen,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  searchRoute,
  recipeNewRoute,
  recipeEditRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
