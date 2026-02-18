# Month-End Reconciliation Process
## Standard Operating Procedure

---

## Overview

This document outlines the standard process for preparing account reconciliations during month-end close. All preparers should follow these guidelines to ensure consistent, high-quality reconciliations that meet SOX control requirements and audit standards.

---

## Step 1: Data Gathering (Day 1-2)

### Required Data Exports

**From ERP (SAP)**:
- General ledger transaction detail for the account
- Account balance report (current and prior periods)
- Trial balance for context

**From Source Systems** (as applicable):
- Salesforce: Contract data for revenue accounts
- NetSuite: Billing and invoice data
- AP System: Vendor invoices and aging reports
- Expense System: Employee expense reports
- Intercompany System (Trintech): IC transaction logs

**From Shared Drives**:
- Prior period reconciliations (for reference)
- Contracts and agreements
- Supporting calculations and schedules

### Initial Review
- Review account activity for the month
- Identify large or unusual transactions
- Compare current balance to prior period and budget
- Flag items that will need investigation

---

## Step 2: Prepare Rollforward (Day 2-3)

### Rollforward Format

Every reconciliation must include:

```
Beginning Balance (from prior month ending balance)
+ Additions (debits for asset/expense, credits for liability/revenue)
- Reductions (credits for asset/expense, debits for liability/revenue)
= Ending Balance

Ending Balance per Reconciliation = Ending Balance per GL ✓
```

### Transaction Categorization
- Categorize transactions into meaningful groups
- Don't just list every transaction - summarize by type
- Highlight unusual or significant items separately

**Example for Accrued Expenses**:
```
Additions - $1,045,500:
  - Professional Services: $407K (legal, consulting, audit)
  - Cloud Infrastructure: $39K (AWS usage)
  - Facilities: $82K (facilities allocation, utilities)
  - Contractor Services: $48K (engineering contractors)
  - Travel & Entertainment: $16K (employee expenses)
  - Other: $454K (various smaller items)
```

---

## Step 3: Variance Analysis (Day 3-4)

### Variance Explanation Requirements

**Always explain**:
- Why the balance increased or decreased vs. prior month
- What the key drivers are (be specific)
- Whether the variance is consistent with business expectations
- Any unusual or one-time items

**Good variance explanation**:
> "Accrued expenses increased $400K (12.9%) month-over-month, driven primarily by:
> 1. Year-end audit fees accrual of $180K per Deloitte engagement letter
> 2. Accenture ERP consulting fees of $154K for November Phase 2 work (per SOW)
> 3. Elevated legal fees of $72K related to Q4 contract negotiations
> 4. Partially offset by payment of October accruals ($85K)
>
> This variance is consistent with Q4 pattern observed in prior years when audit and consulting activity peaks."

**Poor variance explanation** (avoid):
> "Balance increased due to higher expenses in December."

### Supporting Analysis
- Compare to prior year same period
- Compare to budget or forecast (if available)
- Show trends (if helpful)
- Reference specific transactions by reference number

---

## Step 4: Documentation (Day 3-4)

### Required Supporting Documents

**For Accrued Expenses**:
- AP aging report showing uninvoiced items
- Email confirmations from department heads (completeness)
- Major invoices or contracts supporting large accruals
- Calculation memos for estimated accruals

**For Deferred Revenue**:
- Customer contract listing with deferred balances
- ASC 606 revenue recognition analyses
- Reconciliation to billing system
- Supporting invoices or cash receipts

**For Intercompany Accounts**:
- IC transaction log from Trintech
- Reconciliation to subsidiary books
- Email confirmation from subsidiary controller
- Aging analysis
- FX rate documentation

**For Prepaid Expenses**:
- Amortization schedule by item
- Contracts or invoices for new prepaid items
- Proof of payments
- Prior period comparison

### Documentation Best Practices
- Attach source documents (don't just reference them)
- Label documents clearly (e.g., "Exhibit A - AP Aging Report")
- Ensure documents are current (as of month-end)
- Include emails as PDFs or text files

---

## Step 5: Completeness Procedures (Day 3-4)

### Why Completeness Matters
For liability accounts (payables, accruals), the risk is **understatement** - we might be missing obligations. We must affirmatively demonstrate that all obligations are captured.

### Required Completeness Procedures

**1. Review Post-Period Payments**
- Look at payments made in first 5-10 days of next month
- Identify any payments for goods/services delivered in prior month
- Ensure those items were accrued

**2. Department Head Confirmations**
- Email relevant business owners asking: "Do you have any unpaid invoices or unbilled services for December?"
- Document responses
- Follow up on identified items

**3. Review AP Aging**
- Check for old unpaid invoices that should be accrued
- Investigate any unusual items

**4. Compare to Prior Periods**
- Are there recurring items we accrued last month/year that we should accrue again?
- Examples: Monthly cloud services, quarterly subscriptions, annual insurance

**5. Management Review**
- Controller reviews for reasonableness
- Questions items that seem low/missing

### Document Your Completeness Work
Include a section in your reconciliation:
> "Completeness Assertion: The following procedures were performed to ensure completeness of accruals:
> ✓ Reviewed AP aging report for uninvoiced items (see Exhibit A)
> ✓ Obtained confirmations from department heads (see Exhibit B)
> ✓ Analyzed post-period payments for prior period items
> ✓ Compared to prior period accrual patterns
>
> No material unrecorded liabilities identified."

---

## Step 6: Risk Assessment (Day 3-4)

### Self-Assessment
Before submitting to reviewer, assess:
- Are there any unusual items that need extra explanation?
- Is my variance explanation clear and specific?
- Do I have supporting docs for all significant items?
- Have I addressed completeness?
- Does this tie to the GL?

### Common Controller Questions (be proactive)
Anticipate and answer these before submitting:
- "Why did this balance change?"
- "What supports this number?"
- "How do we know we didn't miss anything?"
- "Is this consistent with prior periods / expectations?"

---

## Step 7: Submission & Review (Day 4-5)

### Submission Checklist
Before submitting to reviewer:
- ✓ Rollforward complete and ties to GL
- ✓ Variance analysis written (specific, not generic)
- ✓ Supporting documents attached and labeled
- ✓ Completeness procedures documented
- ✓ Unusual items explained
- ✓ Preparer name and date on recon

### Review Process
1. Submit reconciliation in BlackLine or via email/shared drive
2. Controller reviews (typically within 24 hours)
3. If approved → Done
4. If comments/questions → Address and resubmit

### Addressing Review Comments
- Read comments carefully
- Provide specific responses (don't just make minimal changes)
- Add documentation if requested
- Resubmit promptly (same day if possible)

---

## Quality Standards

### What "Good" Looks Like
The Controller has repeatedly said that excellent reconciliations:
1. **Tell a coherent story** - someone unfamiliar with the account can understand what happened
2. **Proactively explain unusual items** - don't make reviewer ask
3. **Reference prior periods** - show understanding of account behavior over time
4. **Include purposeful documentation** - not data dumps, but the right evidence
5. **Are review-ready** - complete the first time, minimal back-and-forth

### Common Reasons for Rejection
- Variance explanation too vague or generic
- Missing supporting documentation
- No completeness procedures documented
- Unusual items not explained
- Doesn't tie to GL
- Unclear presentation

---

## Tips for Success

### Pattern Recognition
After doing an account a few times, you'll notice patterns:
- Certain vendors always invoice late (so accrue based on prior month)
- Certain expenses spike in specific months (Q4 audit fees, year-end bonuses)
- Certain accounts have recurring timing differences

Document these patterns so:
- You remember them next month
- Others can learn if you're out

### Time Management
- Don't wait until Day 4 to start
- Tackle hardest accounts first when you're fresh
- Ask for help early if stuck
- Build in buffer time for review cycles

### Communication
- Proactively communicate issues to Maria (Accounting Manager) or Sarah (Controller)
- If you can't get needed info from a business partner, escalate
- If you're running behind, say so (don't surprise people on Day 5)

### Learning & Improvement
- Read prior period recons to understand what good looks like
- Ask Jake for advice (he's been doing this for years)
- Pay attention to controller feedback - she's trying to help you improve
- Keep a personal "lessons learned" doc

---

## Resources

### Tools
- **BlackLine**: Reconciliation management system
- **SAP**: General ledger and transaction detail
- **Excel**: Rollforward calculations and analysis
- **Shared Drive**: Prior period recons and reference materials

### People to Ask for Help
- **Jake Morrison**: Senior accountant, great at variance investigation
- **Maria Rodriguez**: Accounting manager, process questions
- **Treasury Team**: Intercompany questions, FX rates
- **Business Partners**: Department heads for completeness confirmations

### Reference Materials
- Prior period reconciliations (see `data/prior_reconciliations/`)
- Accounting policies document
- Chart of accounts
- Email templates for completeness confirmations

---

## Version Control

This SOP is maintained by Maria Rodriguez (Accounting Manager).

Last updated: November 2025
Next review: February 2026
