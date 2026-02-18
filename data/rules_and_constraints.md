# Rules & Constraints for Account Reconciliations
## Verifiability Requirements

This document outlines the mandatory rules, constraints, and quality checks that all account reconciliations must satisfy. These serve as "linting rules" for reconciliation quality.

---

## 1. Mathematical Accuracy Rules

### Rule 1.1: Rollforward Must Reconcile
```
Beginning Balance + Additions - Reductions = Ending Balance
AND
Ending Balance = GL Balance (must match exactly)
```

**Severity**: CRITICAL - Reconciliation cannot be approved if this fails

**Verification**:
- Calculate: `beginning_balance + sum(debits) - sum(credits)`
- Compare to GL ending balance
- Variance must be $0.00

---

### Rule 1.2: Transaction Completeness
```
Sum of all transactions in detail = Net change in rollforward
```

**Severity**: HIGH - Indicates missing transactions or categorization errors

**Verification**:
- Sum all transaction debits
- Sum all transaction credits
- Net = Ending Balance - Beginning Balance
- Must tie to rollforward net change

---

### Rule 1.3: No Unexplained Plug Figures
```
No reconciling items labeled "plug", "adjustment", or "to balance"
```

**Severity**: CRITICAL - SOX control deficiency

**Verification**:
- Search transaction descriptions for keywords: "plug", "to balance", "to tie", "balancing"
- All amounts must have business explanation

---

## 2. Variance Analysis Rules

### Rule 2.1: Material Variance Threshold
```
IF abs(current_balance - prior_balance) > $50,000 OR
   abs((current_balance - prior_balance) / prior_balance) > 10%
THEN variance explanation is REQUIRED
```

**Severity**: HIGH - Required for audit support

**Verification**:
- Calculate $ variance: `current - prior`
- Calculate % variance: `(current - prior) / prior * 100`
- If material, check for variance explanation section
- Explanation must be >50 words (not just "due to business activity")

---

### Rule 2.2: Specific vs. Generic Explanations
```
PROHIBITED phrases:
- "due to timing differences" (without specifying WHAT timing differences)
- "normal business activity" (too vague)
- "various transactions" (need to break down)
- "miscellaneous items" (categorize specifically)
```

**Severity**: MEDIUM - Quality issue, likely rejected in review

**Verification**:
- Use NLP to detect generic phrases
- Flag for human review if found
- Explanation should include specific transaction references, amounts, and business context

---

### Rule 2.3: Prior Period Comparison
```
IF variance is >$100K THEN
  Must include comparison to same period last year
```

**Severity**: MEDIUM - Best practice for trend analysis

**Verification**:
- Check if prior year data is referenced
- Bonus: Include seasonal pattern analysis (e.g., "consistent with Q4 2024 pattern")

---

## 3. Supporting Documentation Rules

### Rule 3.1: High-Risk Account Documentation
```
High-risk accounts (per chart of accounts) require:
- Rollforward schedule
- Transaction detail listing
- Supporting evidence for items >$50K
- Completeness assertion
- Risk assessment
```

**Severity**: CRITICAL - SOX requirement

**Verification**:
- Check account risk level in chart of accounts
- If High, verify all 5 components present
- Attachments must be referenced in reconciliation text

---

### Rule 3.2: Supporting Evidence Threshold
```
FOR each transaction >$50K:
  Must attach OR reference supporting document:
  - Invoice, contract, purchase order, OR
  - Email confirmation, OR
  - System report, OR
  - Calculation memo
```

**Severity**: HIGH - Audit requirement

**Verification**:
- Identify all transactions >$50K
- Check for attachment reference (e.g., "see Exhibit A", "per invoice INV-123")
- Flag missing support

---

### Rule 3.3: Document Timeliness
```
Supporting documents must be dated within the reconciliation period
(Exception: prior period comparisons, contracts, policies)
```

**Severity**: MEDIUM - Ensures documents are relevant

**Verification**:
- Parse document dates
- Confirm within month being reconciled (allow +/- 5 days for month-end cutoff)

---

## 4. Completeness Rules (Liability Accounts)

### Rule 4.1: Completeness Procedures Required
```
FOR liability accounts (AP, Accruals, Deferred Revenue):
  Must document completeness procedures:
  - Post-period payment review, OR
  - Business partner confirmations, OR
  - System aging analysis, OR
  - Prior period pattern comparison
```

**Severity**: HIGH - SOX control for understatement risk

**Verification**:
- Search for keywords: "completeness", "reviewed aging", "confirmed with", "post-period payments"
- Must describe procedure performed AND result

---

### Rule 4.2: Business Partner Confirmation
```
FOR accrual accounts:
  Must attach email confirmation from relevant business owner
  confirming no missing obligations
```

**Severity**: HIGH - Evidence of control execution

**Verification**:
- Check for email attachments from department heads
- Email must be dated within close period
- Email must address completeness question

---

## 5. Account-Specific Rules

### Rule 5.1: Intercompany Reconciliation to Subsidiary
```
FOR intercompany accounts (18200, 18210, 28200, 28210):
  Must reconcile to subsidiary books
  Timing differences must be identified and explained
  Subsidiary confirmation required
```

**Severity**: CRITICAL - Consolidation requirement

**Verification**:
- Check for subsidiary balance comparison
- Verify timing differences are listed
- Confirm subsidiary controller email attached

---

### Rule 5.2: Deferred Revenue - Contract Support
```
FOR deferred revenue (15210):
  Must attach OR reference customer contracts
  Revenue recognition policy must be documented
  ASC 606 analysis required for complex arrangements
```

**Severity**: HIGH - Revenue recognition compliance

**Verification**:
- Check for contract references
- Verify revenue recognition methodology described
- For contracts >$500K, check for ASC 606 memo

---

### Rule 5.3: Accruals - Estimation Methodology
```
FOR estimated accruals (utilities, cloud services, etc.):
  Must document estimation methodology:
  - Formula used (e.g., "MTD usage / days * 30")
  - Data source (e.g., "AWS console as of 12/3")
  - Comparison to prior periods
  - Validation when invoice received next month
```

**Severity**: MEDIUM - Audit trail for estimates

**Verification**:
- Identify estimated items (vs. invoice-based)
- Check for methodology description
- Verify data source cited

---

### Rule 5.4: Prepaid Expenses - Amortization Schedule
```
FOR prepaid expenses (13400):
  Must attach amortization schedule showing:
  - Original prepaid amount and date
  - Total amortization period
  - Monthly amortization amount
  - Remaining unamortized balance
```

**Severity**: HIGH - Valuation accuracy

**Verification**:
- Check for amortization schedule attachment
- Verify schedule total = GL balance
- Confirm individual items sum to total

---

## 6. Review & Approval Rules

### Rule 6.1: Preparer & Reviewer Segregation
```
Preparer ≠ Reviewer (different people)
Reviewer must have appropriate authority level:
- High-risk accounts: Controller or above
- Medium-risk: Manager or above
- Low-risk: Senior accountant or above
```

**Severity**: CRITICAL - SOX segregation of duties

**Verification**:
- Check preparer name ≠ reviewer name
- Verify reviewer's role matches account risk level (from chart of accounts)

---

### Rule 6.2: Review Evidence
```
Reviewer must provide:
- Approval date (within close timeline)
- Comments OR explicit "Approved" statement
- Evidence of review (not just signature)
```

**Severity**: HIGH - Control operating effectively

**Verification**:
- Check for reviewer comments section
- Verify date is after preparer date
- Look for substantive comments (questions asked, confirmations)

---

### Rule 6.3: Review Timeliness
```
Review must be completed within close calendar:
- Submission: By Day 4
- First review: Within 24 hours
- Resubmission (if needed): Within 12 hours
- Final approval: By Day 8
```

**Severity**: MEDIUM - Process efficiency

**Verification**:
- Compare dates to close calendar
- Flag late submissions or reviews

---

## 7. Format & Presentation Rules

### Rule 7.1: Required Sections
```
ALL reconciliations must include:
1. Header (Account, Period, Preparer, Reviewer, Status)
2. Account Balance Reconciliation (rollforward)
3. Variance Analysis
4. Supporting Documentation (listed/attached)
5. Preparer Notes
6. Reviewer Comments
```

**Severity**: MEDIUM - Standardization

**Verification**:
- Parse document structure
- Check for section headers
- Flag missing sections

---

### Rule 7.2: Amounts Formatted Consistently
```
All dollar amounts must:
- Include $ symbol and commas
- Show 2 decimal places (or 0 for rounded)
- Use parentheses for negatives (not minus sign)
- Be right-aligned in tables
```

**Severity**: LOW - Readability

**Verification**:
- Regex check for format: `$X,XXX,XXX.XX` or `$(X,XXX,XXX.XX)`
- Flag inconsistencies

---

## 8. Risk-Based Requirements

### Rule 8.1: Risk Assessment Section
```
High-risk accounts must include:
- Specific risks identified (completeness, valuation, cutoff, etc.)
- Mitigating controls performed
- Residual risk assessment
```

**Severity**: MEDIUM - Demonstrates understanding

**Verification**:
- Check for "Risk Assessment" section
- Verify risks are specific to account type (not generic)

---

### Rule 8.2: Unusual Items Flagged
```
Transactions meeting ANY criteria must be highlighted:
- Amount >$100K
- New vendor/customer (not in prior periods)
- Manual journal entry (vs. system-generated)
- Description contains "adjustment", "correction", "true-up"
- Round numbers (e.g., $50K, $100K, $500K)
```

**Severity**: MEDIUM - Professional skepticism

**Verification**:
- Scan transactions for criteria
- Check if unusual items are discussed in narrative

---

## 9. Data Quality Rules

### Rule 9.1: No Circular References
```
Ending balance cannot reference itself in calculation
(e.g., "Ending balance = Beginning balance + Additions - Reductions + Plug to tie")
```

**Severity**: CRITICAL - Logic error

**Verification**:
- Check for plug/balancing entries
- Verify all inputs are independent

---

### Rule 9.2: Consistent Data Sources
```
All balances and transactions must trace to official source:
- GL balances: SAP ERP system
- Transaction detail: SAP transaction listing
- Supporting docs: Vendor systems, email, contracts
```

**Severity**: HIGH - Data integrity

**Verification**:
- Check for source citations
- Verify GL balance matches ERP export

---

### Rule 9.3: No Manual Overrides Without Explanation
```
IF calculation formula exists BUT
   final number differs from formula result
THEN explanation is REQUIRED
```

**Severity**: HIGH - Transparency

**Verification**:
- Recalculate formulas
- Flag differences between formula and stated result
- Check for override explanation

---

## 10. Continuous Improvement Rules

### Rule 10.1: Prior Period Learnings
```
IF prior month was rejected/resubmitted THEN
   current month should address prior feedback
```

**Severity**: LOW - Quality improvement

**Verification**:
- Compare current to prior month comments
- Check if prior issues resolved

---

### Rule 10.2: Institutional Knowledge Capture
```
RECOMMENDED: Document recurring patterns, issues, or decisions
for future reference
```

**Severity**: LOW - Best practice

**Verification**:
- Check for "Notes for next month" section
- Award bonus points for knowledge sharing

---

## Summary: Automated Quality Scoring

### Critical Failures (Cannot Approve):
- Rollforward doesn't tie to GL
- Missing preparer/reviewer segregation
- High-risk account missing required documentation
- No completeness procedures for liability accounts

### High Priority Issues (Likely Rejection):
- Material variance without explanation
- Missing support for >$50K transactions
- Generic/vague explanations
- Missing intercompany reconciliation

### Medium Priority Issues (May Request Clarification):
- No prior period comparison
- Inconsistent formatting
- Missing risk assessment on high-risk accounts

### Low Priority Issues (Suggestions):
- Could improve presentation
- Consider adding trend analysis
- Document lessons learned

---

**Version**: 1.0
**Last Updated**: December 2025
**Maintained By**: Sarah Chen, Controller
