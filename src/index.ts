import { Context, Hono, Next } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { prettyJSON } from "hono/pretty-json";

const app = new Hono();

// Global middleware
app.use("*", logger());

// Create a sub-app for API routes
const api = new Hono();

// API-wide middleware
api.use("*", cors());
api.use("*", async (c, next) => {
  console.log("Applying prettyJSON middleware");
  await prettyJSON({
    space: 4,
  })(c, next);
});

// Create a sub-app for v1 of the API
const v1 = new Hono();
app.use("*", prettyJSON());

// Authentication middleware example
const auth = async (c: Context, next: Next) => {
  // Check for auth token, etc.
  // For demonstration, we'll just set a user property
  c.set("user", { id: 1, name: "Authenticated User" });
  await next();
};

const users = [
  { id: 1, name: "John Doe" },
  { id: 2, name: "Jane Doe" },
];

// Use middleware for all v1 routes
v1.use("*", auth);

// Define v1 routes without repeating '/api/v1'
v1.get("/users", (c) => {
  const user = c.get("user");
  console.log(`Request made by user: ${user.name}`);
  return c.json(users);
});

// Example of route-specific middleware
const adminOnly = async (c: Context, next: Next) => {
  const user = c.get("user");
  if (user.role !== "admin") {
    return c.text("Unauthorized", 403);
  }
  await next();
};

v1.get("/admin", adminOnly, (c) => {
  return c.text("Admin area");
});

// Mount v1 routes to /api/v1
api.route("/v1", v1);

// Mount all API routes to /api
app.route("/api", api);

app.get("/hi", (c) => {
  return c.text("Hello Hono!");
});
app.use("/assets/*", (c, next) => {
  console.log("Accessing assets route", c.req.path);
  return serveStatic({ root: "." })(c, next);
});
app.get("/", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>My Hono App</title>
    </head>
    <body>
      <h1>Welcome to my Hono app!</h1>
    </body>
    </html>
  `);
});

export default app;
