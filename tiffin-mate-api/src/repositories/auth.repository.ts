import { IsAny } from "mongoose";
import { IUser, UserModel } from "../models/user.model";


export interface IUserRepository{
    createUser(data:Partial<IUser>): Promise<IUser>;
    getUserByEmail(email: string):Promise<IUser | null>;
    getUserByUsername(username:string):Promise <IUser | null>;
}

export class UserRepository implements IUserRepository{
    async createUser(data: Partial<IUser>){
        const newUser= new UserModel(data);
        await newUser.save();
        return newUser;
    }
    async getUserByEmail(email: string){
        const user=await UserModel.findOne({"email": email});
        return user;
    }
    async getUserByUsername(username:string){
        const user=await UserModel.findOne({"username":username});
        return user;
    }

    async getUserById(id: string){
        const user = await UserModel.findById(id);
        return user;
    }
     async getAllUsers(){
        const users=await UserModel.find();
        return users;
     }
    async getUsersPaginated(page: number = 1, limit: number = 10){
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            UserModel.find().sort({createdAt: -1}).skip(skip).limit(limit),
            UserModel.countDocuments(),
        ]);
        return {
            users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 0,
        };
    }
    async getUserByResetToken(token: string){
        const user = await UserModel.findOne({ resetPasswordToken: token });
        return user;
    }
    async updateUserById(id: string, data: Partial<IUser>){
        const user = await UserModel.findByIdAndUpdate(id, data, { new: true });
        return user;
    }
    async deleteUserById(id: string){
        const user = await UserModel.findByIdAndDelete(id);
        return user;
    }
    // async updateUsersById(id:String , data: Partial<IUser>){
    //     //usermodel.updateOne({_id:id},data);
    //     const updateUser=
    //         await
    
    // }
}
