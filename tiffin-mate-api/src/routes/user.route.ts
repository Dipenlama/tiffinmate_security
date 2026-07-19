import { Router } from 'express';
import userController from '../controllers/user.controller';
import { authorizedMiddelWare } from '../middlewares/authorized.middleware';

const router = Router();

// Update own profile
router.put('/me', authorizedMiddelWare, (req, res) => userController.updateMe(req, res));

export default router;
