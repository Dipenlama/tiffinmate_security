import { Router } from 'express';
import { authorizedMiddelWare, adminMiddleware } from '../middlewares/authorized.middleware';
import itemController from '../cotrollers/item.controller';

const router = Router();

router.get('/', itemController.list);
router.get('/:id', itemController.get);

router.post('/', authorizedMiddelWare, adminMiddleware, itemController.create);
router.put('/:id', authorizedMiddelWare, adminMiddleware, itemController.update);
router.delete('/:id', authorizedMiddelWare, adminMiddleware, itemController.remove);

export default router;
