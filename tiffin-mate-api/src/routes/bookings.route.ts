import { Router } from 'express';
import { bookingController } from '../cotrollers/booking.controller';
import { authorizedMiddelWare } from '../middlewares/authorized.middleware';

const router = Router();

router.post('/', bookingController.createBooking); // allow anonymous (optional auth)
router.get('/', authorizedMiddelWare, bookingController.listUserBookings);
router.get('/:id', authorizedMiddelWare, bookingController.getBooking);

export default router;
