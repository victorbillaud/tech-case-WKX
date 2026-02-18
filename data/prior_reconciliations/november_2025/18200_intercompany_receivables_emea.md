# Account Reconciliation: 18200 - Intercompany Receivables - EMEA
## Period: November 2025

**Prepared by**: Jake Morrison (jmorrison)
**Preparation date**: 2025-12-05
**Reviewed by**: Sarah Chen (Controller)
**Review date**: 2025-12-06
**Status**: Approved

---

## Account Balance Reconciliation

| Component | Amount |
|-----------|--------|
| Beginning Balance (Nov 1) | $3,500,000 |
| Additions (IC charges to EMEA) | $1,480,000 |
| Reductions (payments from EMEA) | ($1,180,000) |
| **Ending Balance (Nov 30)** | **$3,800,000** |

GL ending balance per SAP: **$3,800,000** ✓

---

## Reconciliation to EMEA Books

Intercompany balances must reconcile between US parent and EMEA subsidiary books.

| Description | US Books (Asset) | EMEA Books (Liability) | Difference |
|-------------|------------------|------------------------|------------|
| Ending IC Balance per ledger | $3,800,000 | $(3,820,000) | ($20,000) |

**Reconciling Items**:
- Timing difference: $20,000 - Payment initiated by EMEA on Nov 30 but not received by US until Dec 2. Clears in December. (See Exhibit C - treasury confirmation)

**Reconciled Balance**: $3,800,000 = $3,820,000 - $20,000 ✓

---

## Rollforward Analysis

### Additions - $1,480,000

| Transaction Type | Amount | Description |
|------------------|--------|-------------|
| IT Services Allocation | $750,000 | Monthly allocation per headcount methodology (see Exhibit A) |
| Product Sales | $380,000 | Transfer pricing for products sold to EMEA entity for resale |
| Management Fees | $110,000 | Q3 management fee per intercompany services agreement |
| R&D Cost Sharing | $240,000 | Development costs allocated per cost sharing arrangement |

All transactions posted via IC system (Trintech) with proper approval workflow.

### Reductions - $1,180,000

| Type | Amount | Description |
|------|--------|-------------|
| Cash Payments Received | $1,180,000 | Wire transfers from EMEA entity bank account (see Exhibit B - bank confirmations) |

---

## Variance Analysis

**Month-over-Month Change**: +$300,000 (8.6% increase)

**Key Drivers**:

1. **IT Services Allocation** (+$50K vs. Oct): EMEA headcount increased from 238 to 243 FTEs, driving higher cost allocation. This is consistent with EMEA's expansion into Germany market (new Munich office opened in Nov).

2. **Product Sales** (+$80K vs. Oct): Higher product transfers to support EMEA Q4 sales pipeline. EMEA sales team indicated strong demand in enterprise segment.

3. **R&D Cost Sharing** (+$40K vs. Oct): Elevated development activity on new product features that benefit global operations.

4. **Payment timing** (+$130K vs. expected): EMEA made lower payment than typical due to cash management priorities. Treasury confirmed this is intentional and within normal credit terms. No collection concerns.

---

## Aging Analysis

| Age Bucket | Amount | % of Total |
|------------|--------|------------|
| Current (0-30 days) | $2,100,000 | 55% |
| 31-60 days | $950,000 | 25% |
| 61-90 days | $500,000 | 13% |
| 91+ days | $250,000 | 7% |
| **Total** | **$3,800,000** | **100%** |

The 91+ days balance relates to Q2 management fees that are being settled in Q4 per agreed payment plan with EMEA CFO (see email correspondence Exhibit D).

---

## Risk Assessment & Controls

**Key Risks**:
- **Timing differences**: Transactions recorded in different periods by US and EMEA
- **FX exposure**: Balances denominated in EUR subject to exchange rate movements (not hedged)
- **Transfer pricing compliance**: Allocations must comply with transfer pricing study to avoid tax risk

**Mitigating Controls**:
- Monthly reconciliation with EMEA finance team (completed 12/4, see Exhibit E)
- Treasury review of FX exposure quarterly
- Transfer pricing methodology reviewed annually by tax advisors (last review: Aug 2025)
- All IC transactions >$100K require dual approval

---

## Intercompany Confirmation

Email confirmation received from EMEA Controller (Hans Mueller) on 12/4/2025 confirming their IC payable balance of €3,650,000 which converts to $3,820,000 at 11/30 spot rate of 1.0466.

Confirmed timing difference of $20,000 will clear in December.

---

## Supporting Documentation

**Exhibit A**: IT Services Allocation Methodology and Headcount Report [attached: IT_allocation_nov2025.xlsx]
**Exhibit B**: Bank Confirmations - Wire Transfers Received [attached: bank_wires_nov2025.pdf]
**Exhibit C**: Treasury Email - Timing Difference Confirmation [attached: treasury_confirmation.pdf]
**Exhibit D**: EMEA CFO Email - 91+ Days Payment Plan [attached: emea_payment_plan.pdf]
**Exhibit E**: Intercompany Reconciliation with EMEA [attached: IC_recon_EMEA_nov2025.xlsx]
**Exhibit F**: GL Transaction Detail [attached: GL_detail_18200_nov2025.xlsx]

---

## Preparer Notes

This account reconciles cleanly with minor timing difference that is well-explained and supported. EMEA relationship is functioning well with good communication from their finance team.

The increase in balance is driven by legitimate business activity (headcount growth, product sales) and is not a collections concern. Treasury has confirmed credit risk is low.

I've validated that all IC transactions tie to supporting agreements and follow proper transfer pricing methodology.

---

## Reviewer Comments

**Sarah Chen - 12/6/2025**:
Excellent reconciliation. The reconciliation to EMEA books is well-documented, the aging analysis provides good visibility into collection patterns, and the variance explanation is thorough.

I appreciate the proactive outreach to EMEA controller to confirm balances. This is exactly what I like to see.

Approved.
