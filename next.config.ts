import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// App em `webinar/`; com Yarn workspaces o `next` fica em `../node_modules`, então a raiz do Turbopack é o monorepo.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.join(projectRoot, "..");

const nextConfig: NextConfig = {
  turbopack: {
    root: workspaceRoot,
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  telemetry: false,
});
