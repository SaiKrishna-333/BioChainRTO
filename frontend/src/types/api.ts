/* ========= COMMON ========= */
export type VehicleStatus = "active" | "blocked";
export type RequestStatus = "approved" | "rejected" | "pending";

/* ========= PERSON ========= */
export interface Person {
  name: string;
  email: string;
  aadhaarNumber: string;
  dlNumber: string;
  role: string;
  verificationStatus: string;
}

/* ========= VEHICLE ========= */
export interface Vehicle {
  _id: string;
  regNumber: string;
  make: string;
  model: string;
  year: string;
  status: VehicleStatus;
  chassisNumber?: string;
  engineNumber?: string;
  currentOwner?: string;
  blockchainTxHash?: string;
  ipfsRecordHash?: string;
}

/* ========= OWNERSHIP ========= */
export interface OwnershipRecord {
  from: string;
  to: string;
  transferType: string;
  date: string;
  blockchainTxHash?: string;
}

/* ========= THEFT ========= */
export interface TheftReport {
  status: string;
  policeStation: string;
  firNumber: string;
  incidentDate: string;
}

/* ========= QUICK VERIFY ========= */
export interface QuickVerifyResult {
  regNumber: string;
  make: string;
  model: string;
  year: string;
  status: VehicleStatus;
  isStolen: boolean;
  currentOwner?: Person;
}

/* ========= DETAILED VEHICLE ========= */
export interface DetailedVehicleResult extends QuickVerifyResult {
  chassisNumber: string;
  engineNumber: string;
  theftReport?: TheftReport;
  ownershipHistory: OwnershipRecord[];
  blockchainOwner?: string;
  blockchainTxHash?: string;
}

/* ========= PERSON VERIFY ========= */
export interface PersonVerifyResult {
  person: Person;
  vehicles: Vehicle[];
  ownershipHistories: {
    regNumber: string;
    history: OwnershipRecord[];
  }[];
}

/* ========= REQUEST ========= */
export interface TransferRequest {
  _id: string;
  type: string;
  vehicle?: Vehicle;
  dealer?: Person;
  seller?: Person;
  buyer?: Person;
  status: "pending" | "approved" | "rejected";
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

/* ========= INHERITANCE TRANSFER ========= */
export interface InheritanceRequest {
  _id: string;
  vehicle?: Vehicle;
  deceasedOwner?: Person;
  legalHeir?: Person;
  deathCertificateNumber: string;
  relationshipToDeceased: string;
  successionCertificateNumber?: string;
  courtOrderNumber?: string;
  documents: {
    documentType: string;
    documentUrl: string;
    verified: boolean;
  }[];
  status: "submitted" | "documents_verified" | "rto_review" | "approved" | "rejected";
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

/* ========= THEFT REPORT ADMIN ========= */
export interface TheftReportAdmin {
  _id: string;
  vehicle?: Vehicle;
  reporter?: Person;
  policeStation: string;
  firNumber: string;
  incidentDate: string;
  incidentLocation: string;
  description: string;
  status: "reported" | "under_investigation" | "recovered" | "closed";
  recoveryDate?: string;
  recoveryLocation?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}