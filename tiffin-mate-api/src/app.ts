import express, { Application, Request, Response } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import path from 'path';
import { verifyCsrfToken } from './middlewares/csrf.middleware';
import { sanitizeInputs } from './middlewares/sanitize.middleware';
import paymentController from './controllers/payment.controller';

import authRoutes from './routes/auth.route';
import adminUserRoute from './routes/admin/user.route';
import adminItemRoute from './routes/admin/item.route';
import adminBookingRoute from './routes/admin/booking.route';
import menuRoute from './routes/menu.route';
import bookingRoute from './routes/booking.route';
import paymentRoute from './routes/payment.route';
import itemRoute from './routes/item.route';
import userRoute from './routes/user.route';

const app: Application = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  optionsSuccessStatus: 200,
};

// Security headers (OWASP A05:2021 Security Misconfiguration). Helmet sets
// X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, and
// more with safe defaults. This is a pure JSON API (no server-rendered HTML
// of its own), so the CSP is locked down to "nothing may load" by default -
// there is no page here that should ever execute a script or load a style.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        imgSrc: ["'self'"],
      },
    },
    // The Next.js frontend runs on a different origin/port and loads item
    // images directly from this API's /uploads path - Helmet's default
    // same-origin Cross-Origin-Resource-Policy would silently block that.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(cors(corsOptions));
app.use(cookieParser());

// Stripe requires the exact raw request bytes to verify a webhook's HMAC
// signature (constructEvent), so this route MUST be registered - with its
// own express.raw() body parser - before the global bodyParser.json() below.
// It was previously only reachable via the payment router mounted after the
// global JSON parser, which meant the global parser had already consumed and
// JSON-parsed the body by the time Stripe's SDK saw it: signature
// verification failed unconditionally, on every webhook call, valid or not
// (confirmed empirically with a real HMAC-signed payload before this fix -
// see the payment.webhook.integration.test.ts regression test).
// `limit` is set explicitly (rather than relying on body-parser's undocumented
// default) so a caller who doesn't know STRIPE_WEBHOOK_SECRET can't tie up
// memory/CPU buffering an arbitrarily large body before signature
// verification ever runs and rejects it - real Stripe event payloads are at
// most a few KB, so 1mb leaves generous headroom without leaving the route
// effectively unbounded (OWASP API4:2023 Unrestricted Resource Consumption).
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  (req: Request, res: Response) => paymentController.webhook(req, res)
);

// Likewise bounded explicitly for the same reason: these run ahead of every
// route's own auth/rate-limit checks, so an unbounded limit here would let
// an unauthenticated caller force large-body JSON/urlencoded parsing work
// against endpoints like /api/auth/login before that route's rate limiter
// (or any auth check) ever gets a chance to reject the request. No route in
// this API needs a body anywhere near 10mb - file uploads go through
// multer's own per-field limits instead (see upload.middleware.ts), not this
// global parser.
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));
// Defense-in-depth against NoSQL operator injection (OWASP A03:2021) - strips
// any `$`/`.`-prefixed key from body/query/params before it can reach a
// Mongoose query. Zod validation is the primary defense; this catches
// anything Zod doesn't strictly type (e.g. free-form query params).
app.use(sanitizeInputs);
// Applied globally, after body/cookie parsing, before any route: every
// mutating request (POST/PUT/PATCH/DELETE) must carry a matching CSRF
// cookie+header pair, except the explicitly exempted Stripe webhook path.
app.use(verifyCsrfToken);
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/', (req: Request, res: Response) => {
  res.send('Hello world');
});

app.use('/api/auth', authRoutes);
app.use('/api/admin/users', adminUserRoute);
app.use('/api/admin/items', adminItemRoute);
app.use('/api/admin/bookings', adminBookingRoute);
app.use('/api/menu', menuRoute);
app.use('/api/bookings', bookingRoute);
app.use('/api/booking', bookingRoute); // alias to support singular path from frontend
app.use('/api/payments', paymentRoute);
app.use('/api/items', itemRoute);
app.use('/api/users', userRoute);

export default app;
