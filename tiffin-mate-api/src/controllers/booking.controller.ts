import { Request, Response } from 'express';
import bookingService from '../services/booking.service';
import { CreateBookingDto } from '../dtos/booking.dto';
import { HttpError } from '../errors/http-error';

class BookingController {
	async create(req: Request, res: Response) {
		try {
			const parsed = CreateBookingDto.safeParse(req.body);
			if (!parsed.success) {
				return res.status(400).json({ success: false, error: { message: 'Invalid payload', details: parsed.error.format() } });
			}
			const user = req.user as any;
			if (!user || !user._id) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
			const created = await bookingService.createBooking(String(user._id), parsed.data);
			return res.status(201).json({ success: true, data: created });
		} catch (err: any) {
			const e = err instanceof HttpError ? err : new HttpError(500, err.message || 'Internal Server Error');
			return res.status(e.statusCode).json({ success: false, error: { message: e.message } });
		}
	}

	async getById(req: Request, res: Response) {
		try {
			const booking = await bookingService.getById(req.params.id);
			const user = req.user as any;
			const isOwner = booking.userId && String(booking.userId) === String(user?._id || user?.id);
			const isAdmin = user?.role === 'admin';
			if (!isOwner && !isAdmin) return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
			return res.status(200).json({ success: true, data: booking });
		} catch (err: any) {
			const e = err instanceof HttpError ? err : new HttpError(500, err.message || 'Internal Server Error');
			return res.status(e.statusCode).json({ success: false, error: { message: e.message } });
		}
	}

	async list(req: Request, res: Response) {
		try {
			const user = req.user as any;
			const page = Number(req.query.page || 1);
			const limit = Number(req.query.limit || 10);
			if (user?.role === 'admin') {
				const data = await bookingService.listAll(page, limit);
				return res.status(200).json({ success: true, data });
			}
			const data = await bookingService.listForUser(String(user?._id || user?.id), page, limit);
			return res.status(200).json({ success: true, data });
		} catch (err: any) {
			const e = err instanceof HttpError ? err : new HttpError(500, err.message || 'Internal Server Error');
			return res.status(e.statusCode).json({ success: false, error: { message: e.message } });
		}
	}

	async listByUser(req: Request, res: Response) {
		try {
			const user = req.user as any;
			const targetUserId = req.params.userId;
			const page = Number(req.query.page || 1);
			const limit = Number(req.query.limit || 10);
			const isSelf = String(user?._id || user?.id) === String(targetUserId);
			const isAdmin = user?.role === 'admin';
			if (!isSelf && !isAdmin) return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
			const data = await bookingService.listForUser(targetUserId, page, limit);
			return res.status(200).json({ success: true, data });
		} catch (err: any) {
			const e = err instanceof HttpError ? err : new HttpError(500, err.message || 'Internal Server Error');
			return res.status(e.statusCode).json({ success: false, error: { message: e.message } });
		}
	}

	async remove(req: Request, res: Response) {
		try {
			const user = req.user as any;
			const data = await bookingService.deleteBooking(req.params.id, user);
			return res.status(200).json({ success: true, data });
		} catch (err: any) {
			const e = err instanceof HttpError ? err : new HttpError(500, err.message || 'Internal Server Error');
			return res.status(e.statusCode).json({ success: false, error: { message: e.message } });
		}
	}
}

export default new BookingController();
