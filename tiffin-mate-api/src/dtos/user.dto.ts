import z from "zod";
import { userSchema } from "../types/user.types";
import { passwordSchema } from "../validators/password-policy";

export const CreateUserDto=userSchema.pick(
    {
        email: true,
        username: true,
        password:true
    }

).extend(//add new attribute to schema

{
    confirmPassword:z.string().min(1).nullable().optional()
}
).refine(//extra validation from existing atributes
    (data)=>data.password===data.confirmPassword,
    {
        message: "Password and confirm password must match",
        path:["confirmPassword"]//throws error on confirm field
    }
).refine(
    // Prevent trivially guessable credentials (OWASP ASVS V2.1.6)
    (data) => data.password.toLowerCase() !== data.username.toLowerCase() &&
        data.password.toLowerCase() !== data.email.toLowerCase(),
    {
        message: "Password must not be the same as your username or email",
        path: ["password"],
    }
)
export type CreateUserDto=z.infer<typeof CreateUserDto> ;

export const LoginUserDto = z.object({
        email: z.email(),
        password: z.string().min(1)

    })
export type LoginUserDto =z.infer<typeof LoginUserDto>;

export const UpdateUserDto = z.object({
        email: z.email().optional(),
        username: z.string().min(3).max(20).optional(),
        password: passwordSchema.optional(),
        confirmPassword: z.string().min(1).optional(),
    }).refine((data) => {
        if (data.password || data.confirmPassword) {
            return data.password === data.confirmPassword;
        }
        return true;
    }, {
        message: "Password and confirmPassword must match",
        path: ["confirmPassword"],
    }).refine((data) => Boolean(data.email || data.username || data.password), {
        message: "Provide at least one field to update",
        path: ["email"],
    });

export type UpdateUserDtoType = z.infer<typeof UpdateUserDto>;

// Whitelists exactly which fields an admin may change on another user, and
// validates each one - the previous implementation merged `{...req.body}`
// straight into a Mongoose update, which was both a mass-assignment bug (a
// caller could set mfaEnabled/mfaSecret/resetPasswordToken/etc. directly) and
// a NoSQL update-operator-injection bug (a body like `{"$unset":{...}}` would
// have been passed through as a literal MongoDB update operator). Zod strips
// any key not listed here, so only these four fields can ever reach the DB
// (OWASP A01:2021 Broken Access Control / A03:2021 Injection).
export const AdminUpdateUserDto = z.object({
    email: z.email().optional(),
    username: z.string().min(3).max(20).optional(),
    password: passwordSchema.optional(),
    role: z.enum(['user', 'admin']).optional(),
}).refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
});
export type AdminUpdateUserDto = z.infer<typeof AdminUpdateUserDto>;

export const ForgotPasswordDto = z.object({
    email: z.email(),
});
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordDto>;

export const ResetPasswordDto = z.object({
    token: z.string().min(1, 'Token is required'),
    password: passwordSchema,
});
export type ResetPasswordDto = z.infer<typeof ResetPasswordDto>;
