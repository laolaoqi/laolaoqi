import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { seoPrerender } from "../seoPrerender";
import { recordVisit } from "../visitorTracker";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Security & SEO response headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });
  // Visitor tracking middleware (record page visits with IP geolocation)
  app.use((req, res, next) => {
    // Only track actual page navigation (GET requests to page routes)
    // Exclude: API calls, Vite HMR/dev files, static assets, source files
    if (
      req.method === 'GET' &&
      !req.path.startsWith('/api/') &&
      !req.path.startsWith('/@') &&
      !req.path.startsWith('/node_modules/') &&
      !req.path.startsWith('/src/') &&
      !req.path.startsWith('/__vite') &&
      !req.path.startsWith('/client/') &&
      !req.path.startsWith('/.manus') &&
      !req.path.match(/\.(js|mjs|ts|tsx|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|map|webp|webm|mp4|json|xml|txt|html|webmanifest)$/) &&
      !req.path.includes('__vite') &&
      !req.path.includes('hot-update')
    ) {
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.headers['x-real-ip'] as string || req.socket.remoteAddress || '0.0.0.0';
      // Fire and forget — don't block the response
      recordVisit({
        ip,
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        referer: (req.headers['referer'] || req.headers['referrer'] || '') as string,
      }).catch(() => {});
    }
    next();
  });
  // SEO prerender for search engine bots (must be before other routes)
  app.use(seoPrerender);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
