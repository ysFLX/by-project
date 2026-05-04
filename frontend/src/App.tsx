import { CateringDashboard } from "./components/CateringDashboard";
import { CompanyLogin } from "./components/CompanyLogin";
import { CompanyMealPortal } from "./components/CompanyMealPortal";
import { Home } from "./components/Home";

function getCompanyCode(pathname: string) {
  const match = pathname.match(/^\/uye\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function App() {
  const pathname = window.location.pathname;

  if (pathname === "/catering") {
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
