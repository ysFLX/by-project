export type MealRequestStatus = "submitted" | "eaten" | "collected";

export type ClientCompany = {
  id: string;
  code: string;
  username?: string | null;
  accountType?: "individual" | "corporate" | null;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  notes?: string | null;
  mealUnitPrice?: number | null;
  mealVatEnabled?: boolean | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CompanyPerson = {
  id: string;
  companyId: string;
  name: string;
  department?: string | null;
  employeeCode?: string | null;
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
  people?: Pick<CompanyPerson, "id" | "name" | "department" | "employeeCode">[];
};

export type MenuDocument = {
  id: string;
  month: string;
  title: string;
  fileName: string;
  url: string;
  size: number;
  createdAt: string;
  updatedAt: string;
};

export type MenuDay = {
  date: string;
  items: string[];
  calories?: number | null;
  updatedAt?: string | null;
};

export type OperationSettings = {
  eatenDeadline: string;
  collectedDeadline: string;
};
