import { Request, Response } from 'express';
import { CreateBookingDto } from '../../dtos/booking.dto';
import adminBookingService from '../../services/admin/booking.service';

class AdminBookingController {
  list = async (req: Request, res: Response) => {
    try {
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 10);
      const data = await adminBookingService.list(page, limit);
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
  };

  get = async (req: Request, res: Response) => {
    try {
      const booking = await adminBookingService.get(req.params.id);
      return res.status(200).json({ success: true, data: booking });
    } catch (err: any) {
      return res.status(err.statusCode || 404).json({ success: false, message: err.message || 'Not Found' });
    }
  };

  create = async (req: Request, res: Response) => {
    const parsed = CreateBookingDto.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid payload', details: parsed.error.format() });
    }
    try {
      const userId = (req.body && req.body.userId) || null;
      const created = await adminBookingService.create(userId, parsed.data);
      return res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
  };

  updateStatus = async (req: Request, res: Response) => {
    try {
      const updated = await adminBookingService.updateStatus(req.params.id, req.body, req.user);
      return res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
  };

  remove = async (req: Request, res: Response) => {
    try {
      const deleted = await adminBookingService.remove(req.params.id, req.user);
      return res.status(200).json({ success: true, data: deleted });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
  };
}

export default new AdminBookingController();
