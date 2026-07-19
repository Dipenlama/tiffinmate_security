import mongoose,{Document, Schema} from "mongoose";
import {UserType} from "../types/user.types";
import { required } from "zod/v4/core/util.cjs";
import strict from "assert/strict";

const userSchema: Schema= new Schema(
    {
        email:{type:String, required:true, unique: true},
        username:{type: String,required:true,unique:true},
        password:{type:String,required:true},
        resetPasswordToken:{type:String, required:false},
        resetPasswordExpires:{type:Date, required:false},
        role:{type: String, enum:['user','admin'],default:('user')},
        mfaEnabled:{type: Boolean, default: false},
        mfaSecret:{type: String, required:false},
        mfaTempSecret:{type: String, required:false},
        // Account lockout (OWASP ASVS V2.2.1 / A07:2021): a per-account counter
        // catches credential-stuffing spread across many IPs, which the
        // IP-based rate limiter alone cannot see.
        failedLoginAttempts:{type: Number, default: 0},
        lockUntil:{type: Date, required:false},
    },
    {
        timestamps: true, //auto createdAt and updatedAt
        // Every response in this app that sends a user document straight to
        // the client (register, login, admin list/get/update) relies on
        // res.json(), which serializes Mongoose documents via toJSON(). Without
        // this transform, the bcrypt password hash and the (now-hashed, but
        // still sensitive) password-reset token would be sent to the client on
        // every one of those responses - a real information-disclosure bug
        // caught during manual testing, not a hypothetical (OWASP A02:2021).
        toJSON: {
            transform: (_doc, ret: any) => {
                delete ret.password;
                delete ret.resetPasswordToken;
                delete ret.resetPasswordExpires;
                delete ret.mfaSecret;
                delete ret.mfaTempSecret;
                return ret;
            },
        },
    }
)
export interface IUser extends UserType, Document{  //combined type 
    _id: mongoose.Types.ObjectId;// mongo related attribute
    createdAt: Date;
    updatedAt: Date;

}
export const UserModel = mongoose.model<IUser>('User',userSchema);
//collection name 'users' (plural of 'User')
//UserModel ->db.users

