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
        remarks: { type: String },
        // Invoice Data (auto-generated for new registrations)
        invoice: {
            invoiceNumber: { type: String },
            invoiceDate: { type: Date, default: Date.now },
            // Pricing
            exShowroomPrice: { type: Number, default: 0 },
            roadTax: { type: Number, default: 0 },
            registrationFee: { type: Number, default: 0 },
            insuranceAmount: { type: Number, default: 0 },
            handlingCharges: { type: Number, default: 0 },
            otherCharges: { type: Number, default: 0 },
            gstAmount: { type: Number, default: 0 },
            grandTotal: { type: Number, default: 0 },
            // Payment
            paymentMode: { type: String, default: "Full Payment" },
            paymentStatus: { type: String, default: "Paid" },
            // Verification
            verificationStatus: {
                type: String,
                enum: ["pending", "verified", "rejected"],
                default: "pending"
            },
            verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            verifiedAt: { type: Date },
            verificationRemarks: { type: String },
            // Digital signature
            signatureHash: { type: String },
            // Blockchain reference
            blockchainTxHash: { type: String }
        },
        // Document verification status
        documentsVerified: { type: Boolean, default: false }
    },
    { timestamps: true }
);

export const Request = mongoose.model("Request", requestSchema);
