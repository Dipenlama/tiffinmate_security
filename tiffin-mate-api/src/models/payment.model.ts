import mongoose, { Document, Schema } from 'mongoose';

export type PaymentStatus = 'created' | 'processing' | 'succeeded' | 'failed' | 'cancelled';

export interface IPayment extends Document {
	userId?: mongoose.Types.ObjectId | null;
	bookingId?: mongoose.Types.ObjectId | null;
	amount: number;
	currency: string;
	status: PaymentStatus;
	provider: string; // e.g. 'stripe' | 'mock'
	providerSessionId?: string;
	metadata?: any;
	createdAt: Date;
	updatedAt: Date;
}

const PaymentSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
		bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: false },
		amount: { type: Number, required: true, min: 0 },
		currency: { type: String, required: true, default: 'INR' },
		status: { type: String, enum: ['created', 'processing', 'succeeded', 'failed', 'cancelled'], default: 'created' },
		provider: { type: String, required: true },
		providerSessionId: { type: String, required: false },
		metadata: { type: Schema.Types.Mixed, required: false },
	},
	{ timestamps: true }
);

PaymentSchema.index({ bookingId: 1 });
PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ status: 1 });

export const PaymentModel = mongoose.model<IPayment>('Payment', PaymentSchema);
export default PaymentModel;
