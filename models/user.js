import { ObjectId } from "mongodb";
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
    {
        id: { type: String, required: true },
        isVerified: { type: Boolean, default: false },
        first_name: { type: String, required: true },
        last_name: { type: String, required: true },
        phone: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true},
        address: {   
            house_number: { type: String },
            street: { type: String, required: true },
            landmark: { type: String, required: true },
            city: { type: String, required: true },
            country: { type: String, required: true }
        },
        avatar: { type: String },
        referralCode: { type: String },
        referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
        previleges: [{ type: Number, enum: [100,111, 112, 113,114],default:100}],
        // company:{type:ObjectId, ref:'companies',required:[true, 'the company detail is required']},
        // office: {
        //     type:ObjectId,ref:'stores'
        // },
        // status: { type: String, enum: ["active", "suspended", "relieved", "inactive"], required: true, default: "inactive" },
        password: { type: String, required: [true ,'password is required']},
        otp: {
            code: { type: String },
            expiresAt: { type: Date }
        },
        last_loggin:{type:Date},
        refresh_token:{token:String}
    },
    { timestamps: true }
);

export default mongoose.models.users ||
    mongoose.model("users", UserSchema);