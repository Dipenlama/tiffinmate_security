import bookingService from '../booking.service';

class AdminBookingService {
	list(page?: number, limit?: number) {
		return bookingService.listAll(page, limit);
	}

	get(id: string) {
		return bookingService.getById(id);
	}

	create(userId: string | null, payload: any) {
		return bookingService.createBooking(userId, payload);
	}

	updateStatus(id: string, payload: unknown, currentUser: any) {
		return bookingService.updateStatus(id, payload, currentUser);
	}

	remove(id: string, currentUser: any) {
		return bookingService.deleteBooking(id, currentUser);
	}
}

export default new AdminBookingService();
