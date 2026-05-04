export {
  authenticateDemoUser,
  createDemoCompany,
  deleteDemoCompany,
  getDemoCompanyByCode,
  getDemoState,
  getMonthlyDemoMenu,
  listDemoCompanies,
  listDemoRequests,
  normalizeCode,
  updateDemoCompany,
  updateDemoRequestStatus,
  upsertDemoMealRequest
} from "../../../lib/catering-demo-store";
export type { DemoCompany, DemoMealRequest, DemoMenuDay } from "../../../lib/catering-demo-store";
