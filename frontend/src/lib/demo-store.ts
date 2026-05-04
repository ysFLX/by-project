export {
  authenticateDemoUser,
  createDemoCompany,
  getDemoCompanyByCode,
  getDemoState,
  getMonthlyDemoMenu,
  listDemoCompanies,
  listDemoRequests,
  normalizeCode,
  updateDemoRequestStatus,
  upsertDemoMealRequest
} from "../../../lib/catering-demo-store";
export type { DemoCompany, DemoMealRequest, DemoMenuDay } from "../../../lib/catering-demo-store";
