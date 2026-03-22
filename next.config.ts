import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Evita que o Turbopack use C:\Users\...\package-lock.json como raiz (aviso de múltiplos lockfiles).
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
