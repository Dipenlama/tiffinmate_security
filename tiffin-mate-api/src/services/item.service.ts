import { CreateItemDto, UpdateItemDto } from '../dtos/item.dto';
import itemRepository from '../repositories/item.repository';

class ItemService {
  async create(payload: unknown, userRole?: string) {
    if (userRole !== 'admin') throw new Error('Unauthorized');
    const { data, error } = CreateItemDto.safeParse(payload);
    if (error) throw error;
    return itemRepository.create(data);
  }

  async update(id: string, payload: unknown, userRole?: string) {
    if (userRole !== 'admin') throw new Error('Unauthorized');
    const { data, error } = UpdateItemDto.safeParse(payload);
    if (error) throw error;
    const updated = await itemRepository.update(id, data);
    if (!updated) throw new Error('Not Found');
    return updated;
  }

  async remove(id: string, userRole?: string) {
    if (userRole !== 'admin') throw new Error('Unauthorized');
    const deleted = await itemRepository.delete(id);
    if (!deleted) throw new Error('Not Found');
    return deleted;
  }

  async get(id: string) {
    const item = await itemRepository.findById(id);
    if (!item) throw new Error('Not Found');
    return item;
  }

  async list(query: { page?: number; limit?: number; q?: string; category?: string; available?: boolean }) {
    return itemRepository.list(query);
  }
}

export default new ItemService();
