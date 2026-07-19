import { BookingModel } from '../models/booking.model';
import bookingRepository from '../repositories/booking.repository';
import { CreateBookingDto, CreateBookingDtoType } from '../dtos/booking.dto';
import { HttpError } from '../errors/http-error';
import { z } from 'zod';

export class BookingService {
	validateItems(items: any[]) {
		if (!items || !Array.isArray(items) || items.length === 0) {
			throw new HttpError(400, 'items must be a non-empty array');
		}
		for (let i = 0; i < items.length; i++) {
			const it = items[i];
			if (!it.id || !it.name) throw new HttpError(400, `item[${i}].id and name are required`);
			if (!Number.isInteger(it.qty) || it.qty < 1) throw new HttpError(400, `item[${i}].qty must be >= 1`);
			if (typeof it.price !== 'number' || it.price < 0) throw new HttpError(400, `item[${i}].price must be >= 0`);
		}
	}

	async createBooking(userId: string | null, payload: CreateBookingDtoType) {
		const parsed = CreateBookingDto.safeParse(payload);
		if (!parsed.success) throw new HttpError(400, 'Invalid payload');
		this.validateItems(parsed.data.items);
		const total = parsed.data.items.reduce((sum, it) => sum + (Number(it.subtotal) || 0), 0);
		const address = parsed.data.address ?? null;
		const notes = parsed.data.notes ?? null;
		const bookingData = {
			userId: userId || null,
			draftId: parsed.data.draftId,
			package: parsed.data.package,
			packageName: parsed.data.packageName,
			day: parsed.data.day,
			time: parsed.data.time,
			frequency: parsed.data.frequency,
			items: parsed.data.items,
			total: parsed.data.total ?? total,
			address,
			status: 'pending',
			paymentStatus: 'pending',
			meta: { address, notes },
		};
		return bookingRepository.createBooking(bookingData as any);
	}

	// Backward-compatible alias used by older controllers.
	async create(payload: any) {
		const userId = payload?.userId ? String(payload.userId) : null;
		return this.createBooking(userId, payload);
	}

	async getById(id: string) {
		const b = await bookingRepository.findById(id);
		if (!b) throw new HttpError(404, 'Booking not found');
		return b;
	}

	// Backward-compatible alias used by older controllers.
	async findById(id: string) {
		return bookingRepository.findById(id);
	}

	async listForUser(userId: string, page = 1, limit = 10) {
		return bookingRepository.findByUser(userId, page, limit);
	}

	// Backward-compatible alias used by older controllers.
	async listByUser(userId: string, page = 1, limit = 10, status?: string) {
		const data = await bookingRepository.findByUser(userId, page, limit);
		if (!status) return data;
		return {
			...data,
			items: data.items.filter((item: any) => item.status === status),
		};
	}

	async listAll(page = 1, limit = 10, filters: any = {}) {
		return bookingRepository.listAll(page, limit, filters);
	}

	async deleteBooking(id: string, currentUser: any) {
		const booking = await bookingRepository.findById(id);
		if (!booking) throw new HttpError(404, 'Booking not found');
		const isOwner = booking.userId && String(booking.userId) === String(currentUser?._id || currentUser?.id);
		const isAdmin = currentUser?.role === 'admin';
		if (!isOwner && !isAdmin) throw new HttpError(403, 'Forbidden');
		return bookingRepository.deleteBooking(id);
	}

	async updateStatus(id: string, payload: unknown, currentUser?: any) {
		const normalizedPayload = typeof payload === 'string' ? { status: payload } : payload;
		const UpdateStatusDto = z.object({ status: z.string() });
		const parsed = UpdateStatusDto.safeParse(normalizedPayload);
		if (!parsed.success) throw new HttpError(400, 'Invalid status');
		if (currentUser) {
			const isAdmin = currentUser?.role === 'admin';
			if (!isAdmin) throw new HttpError(403, 'Forbidden');
			const booking = await bookingRepository.findById(id);
			if (!booking) throw new HttpError(404, 'Booking not found');
		}
		return bookingRepository.updateStatus(id, parsed.data.status);
	}

	async findByDraftIdOrIdempotency(key: string) {
		return BookingModel.findOne({ draftId: key }).lean();
	}

	async markPaymentProcessing(id: string) {
		return BookingModel.findByIdAndUpdate(id, { paymentStatus: 'processing' }, { new: true }).lean();
	}

	async markPaymentPaid(id: string) {
		return BookingModel.findByIdAndUpdate(id, { paymentStatus: 'paid' }, { new: true }).lean();
	}
}

export const bookingService = new BookingService();
export default bookingService;
