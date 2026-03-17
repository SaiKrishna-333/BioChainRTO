import express from "express";
import { authRequired, requireRole, biometricRequired } from "../middleware/authMiddleware.js";
import { Request } from "../models/Request.js";
import { Vehicle } from "../models/Vehicle.js";
import { User } from "../models/User.js";
import { OwnershipHistory } from "../models/OwnershipHistory.js";
import {
    registerVehicleOnChain,
    transferVehicleOnChain,
    getCurrentOwnerFromChain
} from "../services/blockchainService.js";
import { storeTransferRecord } from "../services/ipfsService.js";

const router = express.Router();

router.post(
    "/new-registration",
    authRequired,
    requireRole("dealer"),
    async (req, res) => {
        try {
            const { buyerEmail, vehicleDetails } = req.body;

            const buyer = await User.findOne({ email: buyerEmail, role: "owner" });
            if (!buyer) {
                return res.status(400).json({ message: "Buyer not found or invalid role" });
            }

            const vehicle = new Vehicle({
                ...vehicleDetails,
                currentOwner: null
            });
            await vehicle.save();

            const request = new Request({
                type: "newRegistration",
                vehicle: vehicle._id,
                dealer: req.user.id,
                buyer: buyer._id,
                status: "pending"
            });

            await request.save();

            res.status(201).json({ message: "New registration request created", requestId: request._id });
        } catch (err) {
            console.error("new-registration error:", err.message);
            res.status(500).json({ message: "Server error" });
        }
    }
);

router.post(
    "/transfer",
    authRequired,
    requireRole("owner"),
    async (req, res) => {
        try {
            const { vehicleId, buyerEmail } = req.body;

            console.log("Transfer request - vehicleId:", vehicleId);
            console.log("Transfer request - user.id:", req.user.id);
            console.log("Transfer request - userType:", typeof req.user.id);

            const vehicle = await Vehicle.findById(vehicleId);
            if (!vehicle) {
                return res.status(400).json({ message: "Vehicle not found" });
            }

            console.log("Vehicle currentOwner:", vehicle.currentOwner);
            console.log("Vehicle currentOwner type:", typeof vehicle.currentOwner);
            console.log("Vehicle currentOwner toString:", vehicle.currentOwner?.toString());
            console.log("Match check:", String(vehicle.currentOwner) === String(req.user.id));

            if (!vehicle.currentOwner || String(vehicle.currentOwner) !== String(req.user.id)) {
                return res.status(400).json({ message: "You do not own this vehicle" });
            }

            const buyer = await User.findOne({ email: buyerEmail, role: "owner" });
            if (!buyer) {
                return res.status(400).json({ message: "Buyer not found" });
            }

            const request = new Request({
                type: "transfer",
                vehicle: vehicle._id,
                seller: req.user.id,
                buyer: buyer._id,
                status: "pending"
            });

            await request.save();

            res.status(201).json({ message: "Transfer request created", requestId: request._id });
        } catch (err) {
            console.error("transfer error:", err.message);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// Get all requests (RTO only)
router.get(
    "/all",
    authRequired,
    requireRole("rto"),
    async (req, res) => {
        try {
            const requests = await Request.find()
                .populate("vehicle")
                .populate("dealer", "name")
                .populate("seller", "name")
                .populate("buyer", "name")
                .sort({ createdAt: -1 });
            res.json(requests);
        } catch (err) {
            console.error("get all requests error:", err.message);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// Get dealer's own requests (Dealer only)
router.get(
    "/my-requests",
    authRequired,
    requireRole("dealer"),
    async (req, res) => {
        try {
            const requests = await Request.find({ dealer: req.user.id })
                .populate("vehicle")
                .populate("buyer", "name")
                .sort({ createdAt: -1 });
            res.json(requests);
        } catch (err) {
            console.error("get dealer requests error:", err.message);
            res.status(500).json({ message: "Server error" });
        }
    }
);

router.post(
    "/:id/approve",
    authRequired,
    requireRole("rto"),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { regNumber } = req.body;

            const request = await Request.findById(id).populate("vehicle");
            if (!request || request.status !== "pending") {
                return res.status(400).json({ message: "Invalid request" });
            }

            const vehicle = await Vehicle.findById(request.vehicle._id);

            let txHash;
            try {
                if (request.type === "newRegistration") {
                    if (!regNumber) return res.status(400).json({ message: "Registration number required" });
                    vehicle.regNumber = regNumber;

                    // Get user's blockchain wallet address
                    const buyerUser = await User.findById(request.buyer);
                    const ownerAddress = buyerUser.blockchainWalletAddress || `0x${buyerUser._id}`;

                    txHash = await registerVehicleOnChain(
                        vehicle.regNumber,
                        vehicle.chassisNumber,
                        vehicle.engineNumber,
                        vehicle.make,
                        vehicle.model,
                        vehicle.year,
                        ownerAddress
                    );
                    vehicle.currentOwner = request.buyer;
                    vehicle.blockchainTxHash = txHash;
                } else {
                    // Get user's blockchain wallet addresses
                    const sellerUser = await User.findById(request.seller);
                    const buyerUser = await User.findById(request.buyer);
                    const sellerAddress = sellerUser.blockchainWalletAddress || `0x${sellerUser._id}`;
                    const buyerAddress = buyerUser.blockchainWalletAddress || `0x${buyerUser._id}`;

                    txHash = await transferVehicleOnChain(vehicle.regNumber, sellerAddress, buyerAddress, "purchase", "0x00");
                    vehicle.currentOwner = request.buyer;
                    vehicle.blockchainTxHash = txHash;
                }

                await vehicle.save();
            } catch (blockchainErr) {
                console.error("Blockchain operation failed:", blockchainErr.message);
                // If blockchain fails, still allow the operation but log warning
                console.warn("Proceeding without blockchain registration due to:", blockchainErr.message);

                // Set default values if blockchain failed
                if (request.type === "newRegistration" && !vehicle.regNumber) {
                    vehicle.regNumber = regNumber || "TEMP-" + Date.now();
                }
                vehicle.currentOwner = request.buyer;
                vehicle.blockchainTxHash = null; // Mark as pending blockchain sync
                await vehicle.save();
            }

            // Create ownership history record
            const ownershipRecord = await OwnershipHistory.create({
                vehicle: vehicle._id,
                fromOwner: request.seller || null,
                toOwner: request.buyer,
                blockchainTxHash: txHash,
                transferType: request.type === "newRegistration" ? "new_registration" : "purchase",
                biometricVerification: req.biometricVerification || null
            });

            // Store transfer record on IPFS for immutable documentation
            try {
                const transferData = {
                    vehicleRegNumber: vehicle.regNumber,
                    vehicleDetails: {
                        make: vehicle.make,
                        model: vehicle.model,
                        year: vehicle.year,
                        chassisNumber: vehicle.chassisNumber,
                        engineNumber: vehicle.engineNumber
                    },
                    transferType: request.type,
                    fromOwner: request.seller ? (await User.findById(request.seller))?.email : "DEALER",
                    toOwner: (await User.findById(request.buyer))?.email,
                    txHash: txHash,
                    approvedBy: req.user.id,
                    approvedAt: new Date().toISOString(),
                    biometricVerified: !!req.biometricVerification
                };

                const ipfsResult = await storeTransferRecord(transferData);
                ownershipRecord.ipfsDocumentHash = ipfsResult.ipfsHash;
                await ownershipRecord.save();

                // Update vehicle with IPFS reference
                vehicle.ipfsRecordHash = ipfsResult.ipfsHash;
                await vehicle.save();

                console.log(`Transfer record stored on IPFS: ${ipfsResult.ipfsHash}`);
            } catch (ipfsErr) {
                console.error("Failed to store transfer record on IPFS:", ipfsErr.message);
                // Don't fail the operation if IPFS storage fails
            }

            request.status = "approved";
            request.rtoOfficer = req.user.id;
            await request.save();

            res.json({ message: "Request approved", txHash, ipfsHash: ownershipRecord.ipfsDocumentHash });
        } catch (err) {
            console.error("approve error:", err.message);
            res.status(500).json({ message: "Server error" });
        }
    }
);

router.post(
    "/:id/reject",
    authRequired,
    requireRole("rto"),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { remarks } = req.body;

            const request = await Request.findById(id);
            if (!request || request.status !== "pending") {
                return res.status(400).json({ message: "Invalid request" });
            }

            request.status = "rejected";
            request.remarks = remarks;
            request.rtoOfficer = req.user.id;
            await request.save();

            res.json({ message: "Request rejected" });
        } catch (err) {
            console.error("reject error:", err.message);
            res.status(500).json({ message: "Server error" });
        }
    }
);

export default router;
