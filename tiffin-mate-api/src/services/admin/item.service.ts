import itemService from '../item.service';

class AdminItemService {
	create(payload: unknown) {
		return itemService.create(payload, 'admin');
	}

	update(id: string, payload: unknown) {
		return itemService.update(id, payload, 'admin');
	}

	remove(id: string) {
		return itemService.remove(id, 'admin');
	}

	get(id: string) {
		return itemService.get(id);
	}

	list(query: { page?: number; limit?: number; q?: string; category?: string; available?: boolean }) {
		return itemService.list(query);
	}
}

export default new AdminItemService();
