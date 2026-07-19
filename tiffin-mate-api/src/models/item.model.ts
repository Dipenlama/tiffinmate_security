import mongoose, { Document, Schema } from 'mongoose';

export interface IItem extends Document {
  name: string;
  description?: string;
  image?: string;
  price: number;
  category?: string;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: false, trim: true },
    image: { type: String, required: false, trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: false, trim: true },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ItemSchema.index({ name: 1 });
ItemSchema.index({ category: 1 });
ItemSchema.index({ available: 1 });

export const ItemModel = mongoose.model<IItem>('Item', ItemSchema);
export default ItemModel;
