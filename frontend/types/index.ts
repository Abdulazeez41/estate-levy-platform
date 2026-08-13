export type UserRole = 'CHAIRMAN' | 'RESIDENT';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  houseNumber?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface MeetingAttachment {
  id?: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt?: string;
}

export interface MeetingSummary {
  id: string;
  title: string;
  venue: string;
  meetingDate: string;
  countdownDays: number;
  attachments?: MeetingAttachment[];
}

export interface MeetingRecord extends MeetingSummary {
  description?: string | null;
  status?: string;
}

export interface ChairmanHouseholdRow {
  householdId: string;
  residentName: string;
  houseNumber: string;
  phone: string | null;
  email: string;
  currentStatus: 'paid' | 'pending' | 'processing' | 'overdue' | 'rejected';
  referenceNumber?: string;
}

export interface PendingApproval {
  paymentId: string;
  residentName: string;
  houseNumber: string;
  amount: number;
  submittedAt: string;
  reference: string;
  paymentMethod: string;
  receiptUrl?: string | null;
}

export interface ChairmanDashboardResponse {
  currentLevyMonth: string;
  currentLevy: {
    id: string;
    month: number;
    year: number;
    amount: number;
    currency: string;
    dueDate: string;
    reminderDaysBefore: number;
  };
  receivingAccount?: ReceivingAccount | null;
  stats: {
    totalExpected: number;
    totalCollected: number;
    collectionPercentage: number;
    totalPaidHouseholds: number;
    totalHouseholds: number;
    pendingConfirmationCount: number;
    overdueHouseholdCount: number;
  };
  upcomingMeeting: MeetingSummary | null;
  pendingApprovals: PendingApproval[];
  households: ChairmanHouseholdRow[];
}

export interface ResidentDashboardResponse {
  currentLevyId: string;
  currentInvoiceId?: string | null;
  residentId: string;
  currentLevyMonth: string;
  receivingAccount?: ReceivingAccount | null;
  residentName: string;
  houseNumber: string;
  currentLevyAmount: number;
  currency?: string;
  invoiceStatus?: string | null;
  status: 'paid' | 'pending' | 'processing' | 'overdue' | 'rejected';
  dueDate: string;
  submittedAt?: string | null;
  currentPayment?: {
    id: string;
    status: string;
    amount: number;
    paymentMethod: string;
    reference: string;
    receiptUrl?: string | null;
    submittedAt?: string | null;
    confirmedAt?: string | null;
    rejectionReason?: string | null;
  } | null;
  upcomingMeeting: MeetingSummary | null;
  paymentHistory: Array<{
    paymentId: string;
    monthLabel: string;
    amount: number;
    paymentMethod: string;
    reference: string;
    status: string;
    receiptUrl?: string | null;
    submittedAt?: string | null;
    confirmedAt?: string | null;
    rejectionReason?: string | null;
  }>;
}

export interface ReceivingAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  providerKey: string;
  instructions?: string | null;
  updatedAt?: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  archived: boolean;
  createdAt: string;
}

export interface HouseholdDetail {
  householdId: string;
  houseNumber: string;
  block?: string | null;
  address?: string | null;
  moveInDate?: string | null;
  resident: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
  };
  currentStatus: 'paid' | 'pending' | 'processing' | 'overdue' | 'rejected';
  currentOutstandingBalance: number;
  paymentHistory: Array<{
    id: string;
    monthLabel: string;
    amount: number;
    status: string;
    method: string;
    reference: string;
    receiptUrl?: string | null;
    rejectionReason?: string | null;
    submittedAt?: string | null;
    confirmedAt?: string | null;
  }>;
  uploadedReceipts: Array<{ id: string; reference: string; url?: string | null }>;
  reminderHistory: Array<{ id: string; title: string; message: string; createdAt: string }>;
  auditHistory: Array<{ id: string; action: string; entity: string; createdAt: string }>;
}
