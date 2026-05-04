export type MealRequestStatus = "submitted" | "eaten" | "collected";

export type ClientCompany = {
  id: string;
  code: string;
  name: string;
  contactName?: string | null;
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
