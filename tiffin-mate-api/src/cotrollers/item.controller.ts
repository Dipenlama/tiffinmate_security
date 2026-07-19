import { Request, Response } from 'express';
import itemService from '../services/item.service';

class ItemController {
  create = async (req: Request, res: Response) => {
    try {
      const item = await itemService.create(req.body, req.user?.role);
      res.status(201).json(item);
    } catch (err: any) {
      res.status(err.message === 'Unauthorized' ? 403 : 400).json({ message: err.message || 'Bad Request' });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const item = await itemService.update(req.params.id, req.body, req.user?.role);
      res.json(item);
    } catch (err: any) {
      const status = err.message === 'Unauthorized' ? 403 : err.message === 'Not Found' ? 404 : 400;
      res.status(status).json({ message: err.message || 'Bad Request' });
    }
  };

  remove = async (req: Request, res: Response) => {
    try {
      await itemService.remove(req.params.id, req.user?.role);
      res.status(204).send();
    } catch (err: any) {
      const status = err.message === 'Unauthorized' ? 403 : err.message === 'Not Found' ? 404 : 400;
      res.status(status).json({ message: err.message || 'Bad Request' });
    }
  };

  get = async (req: Request, res: Response) => {
    try {
      const item = await itemService.get(req.params.id);
      res.json(item);
    } catch (err: any) {
      res.status(404).json({ message: 'Not Found' });
    }
  };

  list = async (req: Request, res: Response) => {
    const { page, limit, q, category, available } = req.query;
    const parsedAvailable = typeof available === 'string' ? available === 'true' : undefined;
    const effectiveAvailable = parsedAvailable !== undefined
      ? parsedAvailable
      : (req.user?.role === 'admin' ? undefined : true); // default to available-only for normal users
    const payload = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q: q as string | undefined,
      category: category as string | undefined,
      available: effectiveAvailable,
    };
    const result = await itemService.list(payload);
    res.json(result);
  };
}

export default new ItemController();
