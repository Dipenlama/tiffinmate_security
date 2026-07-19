import { Router } from 'express';
import adminItemController from '../../cotrollers/admin/item.controller';
import { authorizedMiddelWare, adminMiddleware } from '../../middlewares/authorized.middleware';
import { itemUpload } from '../../middlewares/upload.middleware';

const router = Router();

router.use(authorizedMiddelWare, adminMiddleware);

router.get('/', adminItemController.list);
router.get('/:id', adminItemController.get);
router.post('/', itemUpload.single('image'), adminItemController.create);
router.put('/:id', itemUpload.single('image'), adminItemController.update);
router.delete('/:id', adminItemController.remove);

export default router;
