import { BookingService } from "../../services/booking.service";
import { HttpError } from "../../errors/http-error";
import { z } from "zod";

var mockRepo: any;
var mockModel: any;

jest.mock("../../repositories/booking.repository", () => {
  mockRepo = {
    createBooking: jest.fn(),
    findById: jest.fn(),
    findByUser: jest.fn(),
    listAll: jest.fn(),
    updateStatus: jest.fn(),
    deleteBooking: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockRepo,
  };
});

jest.mock("../../models/booking.model", () => {
  mockModel = {
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };
  return { BookingModel: mockModel };
});

const buildPayload = (overrides: any = {}) => ({
  draftId: "draft-1",
  items: [{ id: "item1", name: "One", qty: 1, price: 5, subtotal: 5 }],
  total: 5,
  day: "monday",
  time: "12:00",
  frequency: "once",
  package: "basic",
  packageName: "Basic",
  address: "addr",
  notes: "note",
  ...overrides,
});

describe("BookingService unit", () => {
  let service: BookingService;

  beforeEach(() => {
    service = new BookingService();
    Object.values(mockRepo).forEach((fn: any) => fn.mockReset && fn.mockReset());
    Object.values(mockModel).forEach((fn: any) => fn.mockReset && fn.mockReset());
  });

  it("validateItems throws on empty array", () => {
    expect(() => service.validateItems([] as any)).toThrow(HttpError);
  });

  it("validateItems throws when id missing", () => {
    expect(() => service.validateItems([{ name: "x", qty: 1, price: 1, subtotal: 1 }] as any)).toThrow(/id/);
  });

  it("validateItems throws when qty < 1", () => {
    expect(() => service.validateItems([{ id: "1", name: "x", qty: 0, price: 1, subtotal: 0 }] as any)).toThrow(/qty/);
  });

  it("validateItems throws when price negative", () => {
    expect(() => service.validateItems([{ id: "1", name: "x", qty: 1, price: -1, subtotal: -1 }] as any)).toThrow(/price/);
  });

  it("createBooking rejects invalid payload", async () => {
    await expect(service.createBooking("u1", { total: 0 } as any)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("createBooking calls repo with computed data", async () => {
    mockRepo.createBooking.mockResolvedValue({ _id: "b1" });
    const payload = buildPayload();
    const result = await service.createBooking("user-id", payload);
    expect(mockRepo.createBooking).toHaveBeenCalledTimes(1);
    const saved = mockRepo.createBooking.mock.calls[0][0];
    expect(saved.userId).toBe("user-id");
    expect(saved.status).toBe("pending");
    expect(result).toEqual({ _id: "b1" });
  });

  it("createBooking recalculates total when provided", async () => {
    mockRepo.createBooking.mockResolvedValue({ _id: "b2", total: 999 });
    const payload = buildPayload({ total: 9, items: [{ id: "a", name: "A", qty: 2, price: 3, subtotal: 6 }] });
    const result = await service.createBooking("user-id", payload);
    const saved = mockRepo.createBooking.mock.calls[0][0];
    expect(saved.total).toBe(9);
    expect(result._id).toBe("b2");
  });

  it("getById throws 404 when missing", async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(service.getById("missing" as any)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("deleteBooking throws 404 when not found", async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(service.deleteBooking("id", { _id: "u1" })).rejects.toMatchObject({ statusCode: 404 });
  });

  it("deleteBooking forbids non-owner non-admin", async () => {
    mockRepo.findById.mockResolvedValue({ _id: "b1", userId: "owner" });
    await expect(service.deleteBooking("id", { _id: "other", role: "user" })).rejects.toMatchObject({ statusCode: 403 });
  });

  it("deleteBooking allows owner", async () => {
    mockRepo.findById.mockResolvedValue({ _id: "b1", userId: "owner" });
    mockRepo.deleteBooking.mockResolvedValue({ _id: "b1", status: "cancelled" });
    const result = await service.deleteBooking("id", { _id: "owner", role: "user" });
    expect(result?.status).toBe("cancelled");
  });

  it("listForUser delegates to repository", async () => {
    mockRepo.findByUser.mockResolvedValue({ items: [], total: 0 });
    const res = await service.listForUser("u1", 2, 5);
    expect(mockRepo.findByUser).toHaveBeenCalledWith("u1", 2, 5);
    expect(res.total).toBe(0);
  });

  it("listAll passes filters", async () => {
    mockRepo.listAll.mockResolvedValue({ items: [1], total: 1 });
    const res = await service.listAll(1, 10, { status: "pending" });
    expect(mockRepo.listAll).toHaveBeenCalledWith(1, 10, { status: "pending" });
    expect(res.items.length).toBe(1);
  });

  it("listByUser filters by status when provided", async () => {
    mockRepo.findByUser.mockResolvedValue({ items: [{ status: "pending" }, { status: "delivered" }], total: 2 });
    const res = await service.listByUser("u1", 1, 10, "pending");
    expect(res.items).toHaveLength(1);
    expect(res.items[0].status).toBe("pending");
  });

  it("updateStatus rejects invalid status payload", async () => {
    await expect(service.updateStatus("id", {}, { role: "admin" })).rejects.toMatchObject({ statusCode: 400 });
  });

  it("updateStatus forbids non-admin when currentUser provided", async () => {
    await expect(service.updateStatus("id", { status: "pending" }, { role: "user" })).rejects.toMatchObject({ statusCode: 403 });
  });

  it("updateStatus returns 404 when booking missing for admin", async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(service.updateStatus("id", { status: "pending" }, { role: "admin" })).rejects.toMatchObject({ statusCode: 404 });
  });

  it("updateStatus succeeds for admin", async () => {
    mockRepo.findById.mockResolvedValue({ _id: "b1" });
    mockRepo.updateStatus.mockResolvedValue({ _id: "b1", status: "dispatched" });
    const res = await service.updateStatus("id", { status: "dispatched" }, { role: "admin" });
    expect(res?.status).toBe("dispatched");
  });

  it("findByDraftIdOrIdempotency delegates to model", async () => {
    const lean = jest.fn().mockResolvedValue({ _id: "b1" });
    mockModel.findOne.mockReturnValue({ lean });
    const res = await service.findByDraftIdOrIdempotency("draft-123");
    expect(mockModel.findOne).toHaveBeenCalledWith({ draftId: "draft-123" });
    expect(res?._id).toBe("b1");
  });

  it("markPaymentProcessing updates paymentStatus", async () => {
    const lean = jest.fn().mockResolvedValue({ _id: "b1", paymentStatus: "processing" });
    mockModel.findByIdAndUpdate.mockReturnValue({ lean } as any);
    const res = await service.markPaymentProcessing("id1");
    expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith("id1", { paymentStatus: "processing" }, { new: true });
    expect(res?.paymentStatus).toBe("processing");
  });
});
