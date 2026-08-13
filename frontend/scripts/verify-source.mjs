import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "hooks/use-auth.ts",
  "hooks/use-dashboard.ts",
  "components/common/top-bar.tsx",
  "components/dashboard/stat-card.tsx",
  "components/meetings/meeting-banner.tsx",
  "tsconfig.json",
];

const missing = [];
for (const relativePath of required) {
  try {
    await access(path.join(root, relativePath));
  } catch {
    missing.push(relativePath);
  }
}

if (missing.length) {
  throw new Error(
    `Frontend source is incomplete. Commit and push these paths: ${missing.join(", ")}`,
  );
}

console.log(
  `Frontend source preflight passed (${required.length} required paths found).`,
);
