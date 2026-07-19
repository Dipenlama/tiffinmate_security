import ItemModel, { IItem } from '../models/item.model';

class ItemRepository {
  async create(data: Partial<IItem>) {
    const item = new ItemModel(data);
    await item.save();
    return item.toObject();
  }

  async update(id: string, data: Partial<IItem>) {
    return ItemModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id: string) {
    return ItemModel.findByIdAndDelete(id).lean();
  }

  async findById(id: string) {
    return ItemModel.findById(id).lean();
  }

  async list(params: { page?: number; limit?: number; q?: string; category?: string; available?: boolean }) {
    const { page = 1, limit = 10, q, category, available } = params;
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (q) {
      filter.name = { $regex: q, $options: 'i' };
    }
    if (category) filter.category = category;
    if (typeof available === 'boolean') filter.available = available;

    const [items, total] = await Promise.all([
      ItemModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ItemModel.countDocuments(filter),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 0 };
  }
}

export default new ItemRepository();
