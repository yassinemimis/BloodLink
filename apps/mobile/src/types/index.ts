// نفس الأنواع المستخدمة في الويب مع إضافات خاصة بالموبايل

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

export enum Role {
  DONOR = 'DONOR',
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  ADMIN = 'ADMIN',
}

export enum DonationStatus {
  NOTIFIED = 'NOTIFIED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  bloodGroup: BloodGroup;
  role: Role;
  isAvailable: boolean;
  isVerified: boolean;
  latitude?: number;
  longitude?: number;
  city?: string;
  totalDonations: number;
  lastDonationAt?: string;
  createdAt: string;
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
}

export interface BloodRequest {
  id: string;
  bloodGroup: BloodGroup;
  urgencyLevel: UrgencyLevel;
  unitsNeeded: number;
  unitsFulfilled: number;
  hospital: string;
  description?: string;
  latitude: number;
  longitude: number;
  status: RequestStatus;
  createdAt: string;
  patient?: User;
  donations?: Donation[];
}

export interface Center {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  latitude: number;
  longitude: number;
  openingHours?: string;
  distance?: number;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

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

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  [UrgencyLevel.CRITICAL]: '#DC2626',
  [UrgencyLevel.HIGH]: '#EA580C',
  [UrgencyLevel.MEDIUM]: '#D97706',
  [UrgencyLevel.LOW]: '#059669',
};

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  [UrgencyLevel.CRITICAL]: 'Critique',
  [UrgencyLevel.HIGH]: 'Haute',
  [UrgencyLevel.MEDIUM]: 'Moyenne',
  [UrgencyLevel.LOW]: 'Basse',
};