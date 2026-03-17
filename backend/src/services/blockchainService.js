// blockchainService.js
// This file integrates with Polygon blockchain and VehicleRegistry.sol
import { ethers } from "ethers";

// Contract details - loaded from environment variables dynamically
const getContractAddress = () => process.env.CONTRACT_ADDRESS;

// ABI for the VehicleRegistry contract (updated for Polygon Amoy deployment)
const CONTRACT_ABI = [
    "function registerNewVehicle(string regNumber, string chassisNumber, string engineNumber, string make, string model, uint256 year, address owner) external",
    "function transferOwnership(string regNumber, address to, string memory reason, bytes32 biometricHash) external",
    "function getCurrentOwner(string regNumber) public view returns (address)",
    "function getVehicleInfo(string regNumber) public view returns (string memory, string memory, string memory, string memory, uint256, address, uint8, uint256, uint256)",
    "function getOwnershipHistory(string regNumber) public view returns (tuple(address from, address to, uint256 timestamp, string reason, bytes32 biometricHash)[])",
    "function getVehiclesByOwner(address owner) public view returns (string[] memory)",
    "function updateVehicleStatus(string regNumber, uint8 newStatus) external",
    "event VehicleRegistered(string indexed regNumber, address indexed owner)",
    "event OwnershipTransferred(string indexed regNumber, address indexed from, address indexed to, string reason)",
    "event VehicleStatusChanged(string indexed regNumber, uint8 status)"
];

let provider;
let signer;
let contract;

// Initialize the blockchain connection
const initializeBlockchain = async () => {
    try {
        // For development, connect to Ganache/Hardhat network
        const rpcUrl = process.env.POLYGON_RPC_URL || "http://localhost:8545";
        provider = new ethers.JsonRpcProvider(rpcUrl);

        // Use the private key from environment variables for signing transactions
        const privateKey = process.env.WALLET_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Default hardhat account 0
        signer = new ethers.Wallet(privateKey, provider);

        // Create contract instance only if CONTRACT_ADDRESS is set
        const contractAddress = getContractAddress();
        if (contractAddress) {
            contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
            console.log("✅ Blockchain service initialized successfully");
            console.log(`📄 Contract: ${contractAddress}`);
        } else {
            console.warn("⚠️  Blockchain service: CONTRACT_ADDRESS not configured");
        }
    } catch (error) {
        console.error("❌ Failed to initialize blockchain service:", error.message);
        // Don't throw - allow app to continue without blockchain if needed
    }
};

// Initialize on module load (but don't crash if it fails)
// Delayed initialization to ensure dotenv is loaded first
setTimeout(() => {
    initializeBlockchain().catch(err => console.error("Blockchain init error:", err));
}, 100);

export const registerVehicleOnChain = async (regNumber, chassisNumber, engineNumber, make, model, year, ownerAddress) => {
    try {
        if (!contract) {
            await initializeBlockchain();
        }

        console.log(`Registering vehicle ${regNumber} for owner ${ownerAddress} on blockchain`);

        // Call the registerNewVehicle function on the contract with all parameters
        const tx = await contract.registerNewVehicle(regNumber, chassisNumber, engineNumber, make, model, year, ownerAddress);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();

        console.log(`Vehicle ${regNumber} registered successfully. Transaction hash: ${tx.hash}`);

        return tx.hash;
    } catch (error) {
        console.error("Error registering vehicle on chain:", error.message);
        throw error;
    }
};

export const transferVehicleOnChain = async (regNumber, fromAddress, toAddress, reason = "purchase", biometricHash = "0x0000000000000000000000000000000000000000000000000000000000000000") => {
    try {
        if (!contract) {
            await initializeBlockchain();
        }

        console.log(`Transferring vehicle ${regNumber} from ${fromAddress} to ${toAddress} on blockchain`);

        // Call the transferOwnership function on the contract
        // Note: fromAddress is not passed - contract uses msg.sender automatically
        const tx = await contract.transferOwnership(regNumber, toAddress, reason, biometricHash);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();

        console.log(`Vehicle ${regNumber} transferred successfully. Transaction hash: ${tx.hash}`);

        return tx.hash;
    } catch (error) {
        // Handle specific smart contract errors
        if (error.message.includes("Vehicle is stolen")) {
            console.error("BLOCKED: Vehicle is reported as stolen");
            throw new Error("ERROR - Vehicle is stolen, transfer BLOCKED");
        }
        if (error.message.includes("Vehicle is scrapped")) {
            console.error("BLOCKED: Vehicle is scrapped");
            throw new Error("ERROR - Vehicle is scrapped, transfer BLOCKED");
        }
        console.error("Error transferring vehicle on chain:", error.message);
        throw error;
    }
};

// Function to get current owner of a vehicle
export const getCurrentOwnerFromChain = async (regNumber) => {
    try {
        if (!contract) {
            await initializeBlockchain();
        }

        console.log(`Getting current owner for vehicle ${regNumber} from blockchain`);

        // Call the getCurrentOwner function on the contract
        const owner = await contract.getCurrentOwner(regNumber);

        console.log(`Current owner of vehicle ${regNumber}: ${owner}`);

        return owner;
    } catch (error) {
        console.error("Error getting current owner from chain:", error.message);
        throw error;
    }
};

// Function to update vehicle status on the blockchain
export const updateVehicleStatusOnChain = async (regNumber, newStatus) => {
    try {
        if (!contract) {
            await initializeBlockchain();
        }

        console.log(`Updating status of vehicle ${regNumber} to ${newStatus} on blockchain`);

        // Call the updateVehicleStatus function on the contract
        const tx = await contract.updateVehicleStatus(regNumber, newStatus);

        // Wait for the transaction to be mined
        const receipt = await tx.wait();

        console.log(`Vehicle ${regNumber} status updated to ${newStatus} successfully. Transaction hash: ${tx.hash}`);

        return tx.hash;
    } catch (error) {
        console.error("Error updating vehicle status on chain:", error.message);
        throw error;
    }
};
