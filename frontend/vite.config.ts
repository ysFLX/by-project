import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function exposeComponentSources(): Plugin {
  const projectRoot = __dirname;
  const pagesDir = resolve(projectRoot, "src/pages");
  const componentsDir = resolve(projectRoot, "src/components");
  const files = [
    "Home.tsx",
    "CompanyLogin.tsx",
    "CateringDashboard.tsx",
    "CompanyMealPortal.tsx",
  ];

  return {
    name: "expose-component-sources",
    closeBundle() {
      const outputDir = resolve(projectRoot, "dist/pages");
      const routeGuide = [
        "These files are readable source copies for cPanel inspection.",
        "The actual running app is still bundled under dist/assets.",
        "",
        "Route map:",
        "/                -> Home.tsx",
        "/giris           -> CompanyLogin.tsx",
        "/catering        -> CateringDashboard.tsx",
        "/uye/:company    -> CompanyMealPortal.tsx",
        "",
        "Root router file: ../app-route-map/App.tsx",
      ].join("\n");

      mkdirSync(outputDir, { recursive: true });
      writeFileSync(join(outputDir, "README.txt"), routeGuide, "utf8");

      const appRouteMapDir = resolve(projectRoot, "dist/app-route-map");
      mkdirSync(appRouteMapDir, { recursive: true });
      writeFileSync(join(appRouteMapDir, "App.tsx"), readFileSync(resolve(projectRoot, "src/App.tsx"), "utf8"), "utf8");

      for (const file of files) {
        const sourcePath = join(pagesDir, file);
        const targetPath = join(outputDir, file);
        mkdirSync(dirname(targetPath), { recursive: true });
        writeFileSync(targetPath, readFileSync(sourcePath, "utf8"), "utf8");
      }

      const componentsOutputDir = resolve(projectRoot, "dist/components");
      mkdirSync(componentsOutputDir, { recursive: true });
      writeFileSync(
        join(componentsOutputDir, "FeedbackModal.tsx"),
        readFileSync(join(componentsDir, "FeedbackModal.tsx"), "utf8"),
        "utf8"
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), exposeComponentSources()],
  server: {
    port: 5173
  }
});
