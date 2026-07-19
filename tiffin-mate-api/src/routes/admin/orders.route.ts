import { Router } from 'express';
import { adminOrderController } from '../../cotrollers/admin/order.controller';
import { authorizedMiddelWare, adminMiddleware } from '../../middlewares/authorized.middleware';

const router = Router();

router.get('/', authorizedMiddelWare, adminMiddleware, adminOrderController.listOrders);
router.put('/:id/status', authorizedMiddelWare, adminMiddleware, adminOrderController.updateStatus);

export default router;
