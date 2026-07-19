import { Request, Response } from 'express';
import { CreateBookingDto } from '../dtos/booking.dto';
import { bookingService } from '../services/booking.service';
import { z } from 'zod';

export class BookingController {
  async createBooking(req: Request, res: Response) {
    try {
      const parsed = CreateBookingDto.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: z.formatError(parsed.error) });
      }

      const idempotencyKey = (req.headers['idempotency-key'] as string) || parsed.data.draftId;
      if (idempotencyKey) {
        const existing = await bookingService.findByDraftIdOrIdempotency(idempotencyKey);
        if (existing) {
          return res.status(409).json({ success: false, message: 'Duplicate booking', data: existing });
        }
      }

      // Verify totals
      const sum = parsed.data.items.reduce((s, it) => s + Number(it.subtotal), 0);
      if (Math.abs(sum - parsed.data.total) > 0.01) {
        return res.status(400).json({ success: false, message: 'Total does not match sum of subtotals' });
      }

      const payload: any = { ...parsed.data, paymentStatus: 'pending', meta: { ip: req.ip, ua: req.headers['user-agent'] } };
      if (req.user && (req.user as any)._id) payload.userId = (req.user as any)._id;
      if (idempotencyKey) payload.draftId = idempotencyKey;

      const booking = await bookingService.create(payload);
      return res.status(201).json({ success: true, data: booking });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
  }

  async getBooking(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const booking = await bookingService.findById(id);
      if (!booking) return res.status(404).json({ success: false, message: 'Not found' });

      // owner or admin
      if (req.user && (req.user as any).role === 'admin') return res.status(200).json({ success: true, data: booking });
      if (req.user && (req.user as any)._id && String((req.user as any)._id) === String(booking.userId)) return res.status(200).json({ success: true, data: booking });

      return res.status(403).json({ success: false, message: 'Forbidden' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
  }

  async listUserBookings(req: Request, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 20);
      const status = req.query.status as string | undefined;
      const result = await bookingService.listByUser((req.user as any)._id, page, limit, status);
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
  }
}

export const bookingController = new BookingController();
