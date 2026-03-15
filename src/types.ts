import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  username: string;
}

export interface Stock {
  id?: string;
  uid: string;
  startDate: Timestamp;
  initialBags: number;
  remainingBags: number;
  status: 'active' | 'completed';
  completedAt?: Timestamp;
}

export interface Sale {
  id?: string;
  uid: string;
  stockId: string;
  date: Timestamp;
  bagsSold: number;
  pricePerBag: number;
  total: number;
}

export interface PendingSale {
  id?: string;
  uid: string;
  stockId: string;
  clientName: string;
  date: Timestamp;
  bagsTaken: number;
  pricePerBag: number;
  total: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
