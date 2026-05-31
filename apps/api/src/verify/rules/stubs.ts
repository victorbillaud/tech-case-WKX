import { type RuleDefinition, ruleResult } from "../types.js";

interface StubSpec {
  id: string;
  title: string;
  severity: RuleDefinition["severity"];
  status: "not_applicable" | "not_implemented";
  message: string;
}

const STUBS: StubSpec[] = [
  {
    id: "2.3",
    title: "Prior period comparison",
    severity: "medium",
    status: "not_implemented",
    message: "Prior-year data unavailable for this PoC period.",
  },
  {
    id: "3.1",
    title: "High-risk account documentation",
    severity: "critical",
    status: "not_implemented",
    message: "Full high-risk documentation checklist deferred in PoC.",
  },
  {
    id: "3.3",
    title: "Document timeliness",
    severity: "medium",
    status: "not_implemented",
    message: "Document date parsing not implemented in PoC.",
  },
  {
    id: "4.2",
    title: "Business partner confirmation",
    severity: "medium",
    status: "not_implemented",
    message: "Partner confirmation workflow not implemented in PoC.",
  },
  {
    id: "5.1",
    title: "Intercompany reconciliation",
    severity: "high",
    status: "not_applicable",
    message: "Not applicable to account 24100 (Accrued Expenses).",
  },
  {
    id: "5.2",
    title: "Deferred revenue contract support",
    severity: "high",
    status: "not_applicable",
    message: "Not applicable to accrued expenses account.",
  },
  {
    id: "5.4",
    title: "Prepaid amortization schedule",
    severity: "high",
    status: "not_applicable",
    message: "Not applicable to account 24100.",
  },
  {
    id: "6.2",
    title: "Review evidence",
    severity: "medium",
    status: "not_implemented",
    message: "Review evidence artifacts not implemented in PoC.",
  },
  {
    id: "6.3",
    title: "Review timeliness",
    severity: "low",
    status: "not_implemented",
    message: "Review timeliness tracking not implemented in PoC.",
  },
  {
    id: "7.2",
    title: "Amounts formatted consistently",
    severity: "low",
    status: "not_implemented",
    message: "Formatting consistency checks deferred in PoC.",
  },
  {
    id: "8.1",
    title: "Risk assessment section",
    severity: "medium",
    status: "not_implemented",
    message: "Risk section depth check deferred; presence covered by 7.1.",
  },
  {
    id: "9.1",
    title: "No circular references",
    severity: "medium",
    status: "not_implemented",
    message: "Circular reference detection not implemented in PoC.",
  },
  {
    id: "9.2",
    title: "Consistent data sources",
    severity: "medium",
    status: "not_implemented",
    message: "Cross-source consistency check not implemented in PoC.",
  },
  {
    id: "9.3",
    title: "No manual overrides without explanation",
    severity: "high",
    status: "not_implemented",
    message: "Manual override detection not implemented in PoC.",
  },
  {
    id: "10.1",
    title: "Prior period learnings",
    severity: "low",
    status: "not_implemented",
    message: "Prior period learnings capture not implemented in PoC.",
  },
  {
    id: "10.2",
    title: "Institutional knowledge capture",
    severity: "low",
    status: "not_implemented",
    message: "Knowledge capture not implemented in PoC.",
  },
];

export const stubRules: RuleDefinition[] = STUBS.map((stub) => ({
  id: stub.id,
  title: stub.title,
  severity: stub.severity,
  autoFixable: false,
  check: () =>
    ruleResult(
      { ...stub, autoFixable: false },
      stub.status,
      stub.message,
    ),
}));
