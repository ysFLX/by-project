export type MealRequestStatus = "submitted" | "eaten" | "collected";

export type ClientCompany = {
  id: string;
  code: string;
  username?: string | null;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  notes?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MealRequest = {
  requestNo: string;
  companyId: string;
  companyCode: string;
  companyName: string;
  serviceDate: string;
  headcount: number;
  status: MealRequestStatus;
  note?: string | null;
  submittedAt: string;
  eatenAt?: string | null;
  collectedAt?: string | null;
  updatedAt: string;
};
