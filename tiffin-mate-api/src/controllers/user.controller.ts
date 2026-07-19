import { Request, Response } from 'express';
import bcryptjs from 'bcryptjs';
import { UpdateUserDto } from '../dtos/user.dto';
import { UserRepository } from '../repositories/auth.repository';
import { HttpError } from '../errors/http-error';

const userRepository = new UserRepository();

class UserController {
  async updateMe(req: Request, res: Response) {
    try {
      const parsed = UpdateUserDto.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: { message: 'Invalid payload', details: parsed.error.format() } });
      }
      const user = req.user as any;
      if (!user?._id) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const updates: any = {};
      if (parsed.data.email) updates.email = parsed.data.email;
      if (parsed.data.username) updates.username = parsed.data.username;
      if (parsed.data.password) {
        updates.password = await bcryptjs.hash(String(parsed.data.password), 12);
      }

      const updated = await userRepository.updateUserById(String(user._id), updates);
      if (!updated) throw new HttpError(404, 'User not found');
      return res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      const e = err instanceof HttpError ? err : new HttpError(500, err.message || 'Internal Server Error');
      return res.status(e.statusCode).json({ success: false, error: { message: e.message } });
    }
  }
}

export default new UserController();
