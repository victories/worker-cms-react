import { cors } from 'hono/cors';

export const corsMiddleware = cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Site-Id', 'X-API-Key'],
  exposeHeaders: ['X-Total-Count'],
  maxAge: 86400,
});
