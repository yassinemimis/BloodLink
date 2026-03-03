// ==================== ENUMS ====================
export enum BloodGroup {
  A_POSITIVE = 'A_POSITIVE',
  A_NEGATIVE = 'A_NEGATIVE',
  B_POSITIVE = 'B_POSITIVE',
  B_NEGATIVE = 'B_NEGATIVE',
  AB_POSITIVE = 'AB_POSITIVE',
  AB_NEGATIVE = 'AB_NEGATIVE',
  O_POSITIVE = 'O_POSITIVE',
  O_NEGATIVE = 'O_NEGATIVE',
}

export enum UrgencyLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum RequestStatus {
  PENDING = 'PENDING',
  SEARCHING = 'SEARCHING',
  MATCHED = 'MATCHED',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum DonationStatus {
  NOTIFIED = 'NOTIFIED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum Role {
  DONOR = 'DONOR',
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  ADMIN = 'ADMIN',
}

// ==================== INTERFACES ====================
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  bloodGroup: BloodGroup;
  role: Role;
  avatar?: string;
  isAvailable: boolean;
  isVerified: boolean;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  lastDonationAt?: string;
  totalDonations: number;
  createdAt: string;
}

export interface BloodRequest {
  id: string;
  patientId: string;
  doctorId?: string;
  bloodGroup: BloodGroup;
  urgencyLevel: UrgencyLevel;
  unitsNeeded: number;
  unitsFulfilled: number;
  hospital: string;
  description?: string;
  latitude: number;
  longitude: number;
  status: RequestStatus;
  searchRadius: number;
  createdAt: string;
  expiresAt?: string;
  patient?: User;
  doctor?: User;
  donations?: Donation[];
  _count?: { donations: number };
}

export interface Donation {
  id: string;
  requestId: string;
  donorId: string;
  status: DonationStatus;
  scheduledAt?: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
  donor?: User;
  request?: BloodRequest;
}

export interface Center {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  latitude: number;
  longitude: number;
  openingHours?: string;
  isActive: boolean;
  bloodStocks?: BloodStock[];
}

export interface BloodStock {
  id: string;
  centerId: string;
  bloodGroup: BloodGroup;
  unitsAvailable: number;
  lastUpdated: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
}

// ==================== HELPERS ====================
export const BLOOD_GROUP_LABELS: Record<BloodGroup, string> = {
  [BloodGroup.A_POSITIVE]: 'A+',
  [BloodGroup.A_NEGATIVE]: 'A-',
  [BloodGroup.B_POSITIVE]: 'B+',
  [BloodGroup.B_NEGATIVE]: 'B-',
  [BloodGroup.AB_POSITIVE]: 'AB+',
  [BloodGroup.AB_NEGATIVE]: 'AB-',
  [BloodGroup.O_POSITIVE]: 'O+',
  [BloodGroup.O_NEGATIVE]: 'O-',
};

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  [UrgencyLevel.CRITICAL]: 'Critique',
  [UrgencyLevel.HIGH]: 'Haute',
  [UrgencyLevel.MEDIUM]: 'Moyenne',
  [UrgencyLevel.LOW]: 'Basse',
};

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  [UrgencyLevel.CRITICAL]: 'bg-red-600 text-white',
  [UrgencyLevel.HIGH]: 'bg-orange-500 text-white',
  [UrgencyLevel.MEDIUM]: 'bg-yellow-500 text-black',
  [UrgencyLevel.LOW]: 'bg-green-500 text-white',
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  [RequestStatus.PENDING]: 'En attente',
  [RequestStatus.SEARCHING]: 'Recherche en cours',
  [RequestStatus.MATCHED]: 'Donneur trouvé',
  [RequestStatus.FULFILLED]: 'Satisfaite',
  [RequestStatus.CANCELLED]: 'Annulée',
  [RequestStatus.EXPIRED]: 'Expirée',
};