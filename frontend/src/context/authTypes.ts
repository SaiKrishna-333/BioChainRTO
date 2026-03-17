import { createContext } from "react";

export interface DealerDetails {
  businessName: string;
  gstin: string;
  tin: string;
  licenseNumber: string;
  showroomAddress: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  phone: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  aadhaarNumber?: string | null;
  dlNumber?: string | null;
  hasProfilePhoto?: boolean;
  profilePhoto?: {
    data?: ArrayBuffer | null;
    contentType?: string;
  };
  dealerDetails?: DealerDetails;
}

import type { AxiosInstance } from 'axios';

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  loading: boolean;
  api: AxiosInstance;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);