import { authorizedMiddelWare } from "../../middlewares/authorized.middleware";
import { HttpError } from "../../errors/http-error";
import { NextFunction, Request, Response } from "express";

const mockVerify = jest.fn();
let mockGetUserById = jest.fn();

jest.mock("jsonwebtoken", () => ({ verify: (...args: any[]) => mockVerify(...args) }));

jest.mock("../../repositories/auth.repository", () => {
  return {
    UserRepository: jest.fn(() => ({ getUserById: (...args: any[]) => mockGetUserById(...args) })),
  };
});

const buildRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const buildNext = () => jest.fn() as NextFunction;

describe("authorizedMiddelWare", () => {
  beforeEach(() => {
    mockVerify.mockReset();
    mockGetUserById.mockReset();
  });

  it("returns 401 when Authorization header missing", async () => {
    const req = { headers: {} } as Request;
    const res = buildRes();
    const next = buildNext();
    await authorizedMiddelWare(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when scheme is not Bearer", async () => {
    const req = { headers: { authorization: "Token abc" } } as any;
    const res = buildRes();
    const next = buildNext();
    await authorizedMiddelWare(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 401 when token verification fails", async () => {
    mockVerify.mockImplementation(() => { throw new HttpError(401, "bad token"); });
    const req = { headers: { authorization: "Bearer bad" } } as any;
    const res = buildRes();
    const next = buildNext();
    await authorizedMiddelWare(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 (not 500) when the real jsonwebtoken library rejects a malformed/expired token", async () => {
    // Simulates the actual jsonwebtoken package's error shape: a plain Error
    // with a `name` like JsonWebTokenError/TokenExpiredError and no statusCode,
    // as opposed to the HttpError used in the mock above.
    const jwtError = new Error("jwt malformed");
    jwtError.name = "JsonWebTokenError";
    mockVerify.mockImplementation(() => { throw jwtError; });
    const req = { headers: { authorization: "Bearer not-a-real-token" } } as any;
    const res = buildRes();
    const next = buildNext();
    await authorizedMiddelWare(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when user not found", async () => {
    mockVerify.mockReturnValue({ id: "uid" });
    mockGetUserById.mockResolvedValue(null);
    const req = { headers: { authorization: "Bearer token" } } as any;
    const res = buildRes();
    const next = buildNext();
    await authorizedMiddelWare(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("attaches user and calls next on success", async () => {
    const user = { _id: "uid", role: "user" };
    mockVerify.mockReturnValue({ id: "uid" });
    mockGetUserById.mockResolvedValue(user);
    const req = { headers: { authorization: "Bearer token" } } as any;
    const res = buildRes();
    const next = buildNext();
    await authorizedMiddelWare(req, res, next);
    expect(next).toHaveBeenCalled();
    expect((req as any).user).toEqual(user);
  });
});
