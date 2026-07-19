import { Request, Response } from 'express';
import { bookingService } from '../services/booking.service';

export class PaymentController {
  async createCheckoutSession(req: Request, res: Response) {
    try {
      const { bookingId } = req.body;
      if (!bookingId) return res.status(400).json({ success: false, message: 'bookingId required' });

      const booking: any = await bookingService.findById(bookingId);
      if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
      if (booking.paymentStatus === 'paid') return res.status(400).json({ success: false, message: 'Already paid' });

      // mark processing
      await bookingService.markPaymentProcessing(bookingId);

      // For dev: return mock redirect URL
      const mock = { mock: true, redirect: `/packages/confirm/success?bookingId=${bookingId}` };
      return res.status(200).json({ success: true, data: mock });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
  }
}

export const paymentController = new PaymentController();
