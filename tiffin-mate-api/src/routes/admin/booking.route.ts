import { Router } from 'express';
import adminBookingController from '../../cotrollers/admin/booking.controller';
import { authorizedMiddelWare, adminMiddleware } from '../../middlewares/authorized.middleware';

const router = Router();

router.use(authorizedMiddelWare, adminMiddleware);

router.get('/', adminBookingController.list);
router.get('/:id', adminBookingController.get);
router.post('/', adminBookingController.create);
router.put('/:id/status', adminBookingController.updateStatus);
router.delete('/:id', adminBookingController.remove);

export default router;
