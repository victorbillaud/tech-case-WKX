import type { Account } from "@repo/domain";

const AUTHORITY: Record<string, number> = {
  Staff: 1,
  Manager: 2,
  Director: 3,
  Controller: 4,
  CFO: 5,
};

const RISK_REQUIRED: Record<Account["riskLevel"], number> = {
  Low: 2,
  Medium: 3,
  High: 4,
};

export function authorityMeets(
  role: string,
  riskLevel: Account["riskLevel"],
): boolean {
  const roleLevel = AUTHORITY[role] ?? 0;
  return roleLevel >= RISK_REQUIRED[riskLevel];
}
