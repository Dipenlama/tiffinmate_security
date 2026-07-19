import PaymentModel, { IPayment } from '../models/payment.model';

class PaymentRepository {
	async createPayment(data: Partial<IPayment>) {
		const p = new PaymentModel(data);
		await p.save();
		return p.toObject();
	}

	async findByBooking(bookingId: string) {
		return PaymentModel.find({ bookingId }).sort({ createdAt: -1 }).lean();
	}

	async update(id: string, data: Partial<IPayment>) {
		return PaymentModel.findByIdAndUpdate(id, data, { new: true }).lean();
	}
}

export default new PaymentRepository();
