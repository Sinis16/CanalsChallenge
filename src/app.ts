// src/app.ts
//
// Builds and configures the Fastify instance: registers routes and
// the global error handler. Kept separate from server.ts so the app
// itself can be imported/tested independently of actually starting
// a listener.

import Fastify from "fastify";
import { ordersRoute } from "./routes/orders.route.js";
import { mapErrorToResponse } from "./errors/error-mapping.js";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.register(ordersRoute);

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    const { statusCode, body } = mapErrorToResponse(error);

    if (statusCode === 500) {
      request.log.error(error);
    }

    reply.status(statusCode).send(body);
  });

  return app;
}
