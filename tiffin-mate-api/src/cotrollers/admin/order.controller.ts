import { Request, Response } from 'express';
import { bookingService } from '../../services/booking.service';

export class AdminOrderController {
  async listOrders(req: Request, res: Response) {
    try {
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 20);
      const result = await bookingService.listAll(page, limit);
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const { status } = req.body;
      if (!['accepted', 'dispatched', 'delivered', 'cancelled'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      const updated = await bookingService.updateStatus(id, status);
      if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
      return res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
  }
}

export const adminOrderController = new AdminOrderController();
