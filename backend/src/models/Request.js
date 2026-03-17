import mongoose from "mongoose";

const requestSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["newRegistration", "transfer"],
            required: true
        },
        vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
        dealer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        seller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rtoOfficer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        },
        remarks: { type: String }
    },
    { timestamps: true }
);

export const Request = mongoose.model("Request", requestSchema);
