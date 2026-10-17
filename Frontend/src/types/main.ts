export type ExpertView = "dashboard" | "validation" | "verification" | "settings";

export type DashboardStats = {
  totalDiagnostics: number;
  pendingValidation: number;
  validationRate: number; // 0-100
  avgConfidence: number; // 0-100
  classDistribution: { key: string; count: number }[];
};

export type PendingItem = {
  id: string;
  className: string;
  confidence: number;
  date: string;
};

export type ExpertInfo = {
  name: string;
  email: string;
  role: string;
  memberSince: string;
};

export type UserProfile = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
};