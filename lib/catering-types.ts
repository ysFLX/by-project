export type MealRequestStatus = "submitted" | "eaten" | "collected";

export type ClientCompany = {
  id: string;
  code: string;
  name: string;
  contactName?: string;
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
  note?: string;
  submittedAt: string;
  eatenAt?: string;
  collectedAt?: string;
  updatedAt: string;
};

export type CreateClientCompanyInput = {
  name: string;
  code?: string;
  contactName?: string;
};

export type SubmitMealRequestInput = {
  companyCode: string;
  serviceDate: string;
  headcount: number;
  note?: string;
};
