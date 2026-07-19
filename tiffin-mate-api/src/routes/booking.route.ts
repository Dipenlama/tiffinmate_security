
import { Router } from 'express';
import { authorizedMiddelWare } from '../middlewares/authorized.middleware';
import bookingController from '../controllers/booking.controller';

const router = Router();

router.get('/', authorizedMiddelWare, (req, res) => bookingController.list(req, res));
router.get('/user/:userId', authorizedMiddelWare, (req, res) => bookingController.listByUser(req, res));
router.post('/', authorizedMiddelWare, (req, res) => bookingController.create(req, res));
router.get('/:id', authorizedMiddelWare, (req, res) => bookingController.getById(req, res));
router.delete('/:id', authorizedMiddelWare, (req, res) => bookingController.remove(req, res));

export default router;

