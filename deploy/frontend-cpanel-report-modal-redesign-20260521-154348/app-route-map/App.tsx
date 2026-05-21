import { CateringDashboard } from "./pages/CateringDashboard";
import { CompanyLogin } from "./pages/CompanyLogin";
import { CompanyMealPortal } from "./pages/CompanyMealPortal";
import { Home } from "./pages/Home";
import { hasAdminSession } from "./services/session";

function getCompanyCode(pathname: string) {
  const match = pathname.match(/^\/uye\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function App() {
  const pathname = window.location.pathname;

  if (pathname === "/catering") {
    if (!hasAdminSession()) {
      window.location.replace("/giris");
      return null;
    }

    return <CateringDashboard />;
  }

  if (pathname === "/giris") {
    return <CompanyLogin />;
  }

  if (pathname.startsWith("/uye/")) {
    return <CompanyMealPortal companyCode={getCompanyCode(pathname)} />;
  }

  return <Home />;
}
