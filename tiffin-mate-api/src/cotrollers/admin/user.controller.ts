import { CreateUserDto, AdminUpdateUserDto } from "../../dtos/user.dto";
import z from "zod";
import { Request,Response } from "express";
import { AuthService} from "../../services/auth.service";
import { UserRepository } from "../../repositories/auth.repository";
import { logAuditEvent } from "../../services/audit-log.service";
import bcryptjs from "bcryptjs";
let authService=new AuthService();
const userRepository = new UserRepository();

export class AdminUserController{
    async createUser (req: Request, res: Response){
        //validate
        // call service - reuse AuthService.registerUser
        //handle response
        //handle errors and success responses
        //api path: /api/admin/users.route.ts
         try {
            const parsedResult = CreateUserDto.safeParse(req.body);
            if (!parsedResult.success) {
                return res.status(400).json({
                    success: false, message: z.prettifyError(parsedResult.error)
                });
            }
            const newUser = await authService.registerUser(parsedResult.data);
            const admin = req.user as any;
            logAuditEvent({
                action: 'admin.user.created',
                outcome: 'success',
                actorId: admin?._id ? String(admin._id) : undefined,
                actorEmail: admin?.email,
                targetId: newUser._id.toString(),
                ip: req.ip,
            });
            return res.status(201).json({
                success: true,
                message: "User created successfully",
                data: newUser
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }

    }

    async getUsers(req: Request, res: Response){
        try{
            const page = parseInt((req.query.page as string) || '1', 10);
            const limit = parseInt((req.query.limit as string) || '10', 10);
            const result = await userRepository.getUsersPaginated(page, limit);
            return res.status(200).json({ success: true, data: result });
        }catch(error:any){
            return res.status(error.statusCode || 500).json({ success:false, message: error.message || 'Internal Server Error' });
        }
    }

    async updateUser(req: Request, res: Response){
        try{
            const id = req.params.id;
            const parsed = AdminUpdateUserDto.safeParse(req.body);
            if(!parsed.success){
                return res.status(400).json({ success:false, message: z.prettifyError(parsed.error) });
            }
            const data: any = { ...parsed.data };
            if (data.password) {
                data.password = await bcryptjs.hash(String(data.password), 12);
            }
            const updated = await userRepository.updateUserById(id, data);
            if(!updated){
                return res.status(404).json({ success:false, message: 'User not found' });
            }
            const admin = req.user as any;
            logAuditEvent({
                action: 'admin.user.updated',
                outcome: 'success',
                actorId: admin?._id ? String(admin._id) : undefined,
                actorEmail: admin?.email,
                targetId: id,
                ip: req.ip,
                // Field names only, never values - especially not a new password.
                metadata: { fieldsChanged: Object.keys(parsed.data) },
            });
            return res.status(200).json({ success:true, data: updated });
        }catch(error:any){
            return res.status(error.statusCode || 500).json({ success:false, message: error.message || 'Internal Server Error' });
        }
    }

    async deleteUser(req: Request, res: Response){
        try{
            const id = req.params.id;
            const deleted = await userRepository.deleteUserById(id);
            if(!deleted){
                return res.status(404).json({ success:false, message: 'User not found' });
            }
            const admin = req.user as any;
            logAuditEvent({
                action: 'admin.user.deleted',
                outcome: 'success',
                actorId: admin?._id ? String(admin._id) : undefined,
                actorEmail: admin?.email,
                targetId: id,
                ip: req.ip,
            });
            return res.status(200).json({ success:true, message: 'User deleted successfully' });
        }catch(error:any){
            return res.status(error.statusCode || 500).json({ success:false, message: error.message || 'Internal Server Error' });
        }
    }

    async getUser(req: Request, res: Response){
        try{
            const id = req.params.id;
            const user = await userRepository.getUserById(id);
            if(!user){
                return res.status(404).json({ success:false, message: 'User not found' });
            }
            return res.status(200).json({ success:true, data: user });
        }catch(error:any){
            return res.status(error.statusCode || 500).json({ success:false, message: error.message || 'Internal Server Error' });
        }
    }

    }
