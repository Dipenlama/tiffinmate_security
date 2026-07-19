import { Request, Response } from 'express';
import adminItemService from '../../services/admin/item.service';

class AdminItemController {
  list = async (req: Request, res: Response) => {
    const { page, limit, q, category, available } = req.query;
    const parsedAvailable = typeof available === 'string' ? available === 'true' : undefined;
    const payload = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q: q as string | undefined,
      category: category as string | undefined,
      available: parsedAvailable,
    };
    const data = await adminItemService.list(payload);
    return res.status(200).json({ success: true, data });
  };

  get = async (req: Request, res: Response) => {
    try {
      const item = await adminItemService.get(req.params.id);
      return res.status(200).json({ success: true, data: item });
    } catch (err: any) {
      return res.status(404).json({ success: false, message: 'Not Found' });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const imagePath = req.file ? `/uploads/items/${req.file.filename}` : undefined;
      const incomingImage = typeof req.body?.image === 'string' ? req.body.image : undefined;
      const cleanedImage = (!incomingImage || incomingImage === 'undefined' || incomingImage === 'null') ? undefined : incomingImage;
      if (cleanedImage && cleanedImage.startsWith('data:')) {
        return res.status(400).json({ success: false, message: 'data URI images are not allowed; upload a file instead' });
      }
      const cleanedPrice = req.body?.price === '' || req.body?.price === undefined ? undefined : Number(req.body.price);
      const priceValue = Number.isNaN(cleanedPrice as number) ? undefined : cleanedPrice;
      const cleanedAvailable = req.body?.available === '' || req.body?.available === undefined
        ? undefined
        : String(req.body.available) === 'true';
      const payload = {
        ...req.body,
        price: priceValue,
        available: cleanedAvailable,
        image: imagePath || cleanedImage,
      };
      const item = await adminItemService.create(payload);
      return res.status(201).json({ success: true, data: item });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message || 'Bad Request' });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const imagePath = req.file ? `/uploads/items/${req.file.filename}` : undefined;
      const incomingImage = typeof req.body?.image === 'string' ? req.body.image : undefined;
      const cleanedImage = (!incomingImage || incomingImage === 'undefined' || incomingImage === 'null') ? undefined : incomingImage;
      if (cleanedImage && cleanedImage.startsWith('data:')) {
        return res.status(400).json({ success: false, message: 'data URI images are not allowed; upload a file instead' });
      }
      const cleanedPrice = req.body?.price === '' || req.body?.price === undefined ? undefined : Number(req.body.price);
      const priceValue = Number.isNaN(cleanedPrice as number) ? undefined : cleanedPrice;
      const cleanedAvailable = req.body?.available === '' || req.body?.available === undefined
        ? undefined
        : String(req.body.available) === 'true';
      const payload = {
        ...req.body,
        price: priceValue,
        available: cleanedAvailable,
        image: imagePath || cleanedImage,
      };
      const item = await adminItemService.update(req.params.id, payload);
      return res.status(200).json({ success: true, data: item });
    } catch (err: any) {
      const status = err.message === 'Not Found' ? 404 : 400;
      return res.status(status).json({ success: false, message: err.message || 'Bad Request' });
    }
  };

  remove = async (req: Request, res: Response) => {
    try {
      await adminItemService.remove(req.params.id);
      return res.status(200).json({ success: true, message: 'Deleted' });
    } catch (err: any) {
      const status = err.message === 'Not Found' ? 404 : 400;
      return res.status(status).json({ success: false, message: err.message || 'Bad Request' });
    }
  };
}

export default new AdminItemController();
