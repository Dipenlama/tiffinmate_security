import { Router } from 'express';
import { paymentController } from '../cotrollers/payment.controller';
import { authorizedMiddelWare } from '../middlewares/authorized.middleware';

const router = Router();

router.post('/create-checkout-session', paymentController.createCheckoutSession);

export default router;
