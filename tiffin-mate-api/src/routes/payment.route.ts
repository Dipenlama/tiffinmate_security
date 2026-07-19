import { Router } from 'express';
import paymentController from '../controllers/payment.controller';
import { authorizedMiddelWare } from '../middlewares/authorized.middleware';

const router = Router();

// create checkout session (authenticated)
router.post('/', authorizedMiddelWare, (req, res) => paymentController.createCheckoutSession(req, res));

// NOTE: the Stripe webhook route lives in app.ts, mounted before the global
// JSON body-parser so it can access the raw request bytes signature
// verification needs - see the comment there for why. It used to be defined
// here too, but registering it under this router (mounted after the global
// parser) meant it could never actually verify a signature.

export default router;
