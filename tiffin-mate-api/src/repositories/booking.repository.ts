import { BookingModel, IBooking } from '../models/booking.model';

class BookingRepository {
	async createBooking(data: Partial<IBooking>) {
		const booking = new BookingModel(data);
		await booking.save();
		return booking.toObject();
	}

	async findById(id: string) {
		return BookingModel.findById(id).lean();
	}

	async findByUser(userId: string, page = 1, limit = 10) {
		const skip = (page - 1) * limit;
		const [items, total] = await Promise.all([
			BookingModel.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
			BookingModel.countDocuments({ userId }),
		]);
		return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 0 };
	}

	async listAll(page = 1, limit = 10, filters: any = {}) {
		const skip = (page - 1) * limit;
		const query = { ...filters };
		const [items, total] = await Promise.all([
			BookingModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
			BookingModel.countDocuments(query),
		]);
		return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 0 };
	}

	async updateStatus(id: string, status: string) {
		return BookingModel.findByIdAndUpdate(id, { status }, { new: true }).lean();
	}

	async deleteBooking(id: string) {
		return BookingModel.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true }).lean();
	}
}

export default new BookingRepository();
