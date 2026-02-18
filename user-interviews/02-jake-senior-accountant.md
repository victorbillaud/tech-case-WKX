# Interview: Jake Morrison, Senior Accountant

**Role**: Senior Accountant - Revenue, Intercompany & Accruals
**Tenure**: 4 years at company, 7 years in accounting
**Date**: January 16, 2026

---

## Day-to-Day Reality

**Interviewer**: What does month-end week look like for you?

**Jake**: Stressful. I own about 25 accounts—8 of them high-risk: deferred revenue, unbilled revenue, intercompany receivables/payables, accrued expenses, revenue reserves. Those eat most of my time.

Day 1-2: Pulling data from 5+ systems—ERP for GL, Salesforce for contracts, NetSuite for billing, intercompany tool, shared drives for docs. Each export takes 5-10 minutes, then I stitch them together in Excel with VLOOKUPs.

Day 2-4: Reconciling and investigating variances. This is where I add value but also where I'm drowning. Every close feels like reinventing the wheel.

Day 4-5: Documenting and resubmitting after Sarah's review.

---

## The Investigation Problem

**Interviewer**: You mentioned 60% of your time is investigation. Walk me through an example.

**Jake**: Real example from last month. Intercompany payables to EMEA jumped $1.2M unexpectedly.

First, I export all intercompany transactions—about 200 lines. Filter to EMEA, now 50 lines. Start analyzing big items.

There's an $800K entry for "IT Services Allocation." What's that? I search my email for the allocation methodology IT finance sent last quarter. Find it—it's a PDF calculation based on headcount.

I need to verify EMEA headcount. Email IT finance partner: "Can you confirm EMEA headcount for December was 243?" She responds 6 hours later: "Yes."

Then there's a $300K "Shared Services - Facilities" entry. Dig into that. Pull the facilities agreement, find the cost driver (square footage), confirm we added a new EMEA office that increased charges.

Then smaller items—expenses miscoded to EMEA that should be APAC. Make a reclassification journal entry.

After **4-5 hours**, I can finally write: "IC payable increase of $1.2M driven by: (1) IT allocation up $800K due to EMEA headcount growth, (2) Facilities up $300K due to new London office, (3) Reclassified $100K to APAC."

---

## Documentation Challenges

**Interviewer**: What's hard about documentation?

**Jake**: **Finding the right documents**. I'm dealing with emails, shared drives, contract systems, Slack threads, Excel files someone made 6 months ago.

For deferred revenue, I need customer contracts. Those are in Salesforce. Except old ones are in a legacy system. Some are PDFs in a shared drive organized by sales rep, not customer.

So I spend 20 minutes hunting down the right contract. Then I read it to find relevant clauses—payment terms, delivery milestones, acceptance criteria. Copy excerpts into my memo.

Next month? I'll do it again for the same accounts.

---

## Pattern Recognition

**Interviewer**: You said you're reinventing the wheel. What patterns repeat?

**Jake**: Every month, the same accounts have similar issues:

- **Deferred revenue** always has judgment calls where contract terms are ambiguous. I reference ASC 606 guidance, check prior period treatment.

- **Intercompany** always has timing differences—one entity records on Friday, the other on Monday due to time zones.

- **Accrued expenses** always have 300-500 transactions to categorize. Professional services, cloud infrastructure, facilities, employee expenses. Same categories monthly.

- **Revenue reserves** always has discrepancies between what sales thinks we owe in commission vs. what we've accrued.

I've done these accounts for 4 years. I can pattern match quickly: "Oh, that's a timing difference" or "That's the Q4 scenario we saw last year."

But the **system doesn't know any of this**. It's all in my head. If I leave, that knowledge walks out.

---

## What Would Help Most

**Interviewer**: If you could automate parts of your work, what would be most valuable?

**Jake**: **Automatic variance investigation**. The system sees IC payables went up $1.2M. It automatically:
- Breaks down by transaction type and entity
- Surfaces biggest drivers
- Pulls related documents (allocation methodologies, agreements)
- Shows prior period comparisons
- Flags anything truly unusual vs. expected patterns

I review, confirm it makes sense, add context, write final explanation. But I didn't spend 4 hours hunting.

**Smart documentation suggestions**. If I'm reconciling deferred revenue, the system knows I need:
- List of open contracts with deferred balances
- ASC 606 analyses for each
- Supporting invoices
- Prior period rollforward

Auto-attach those or tell me "You're missing the ASC 606 memo for Acme Corp contract."

**Draft explanations**. Based on transaction analysis and docs, draft a narrative. Even rough, editing is faster than blank page.

---

## Volume Work Reality

**Interviewer**: Tell me about high-volume accounts like accrued expenses.

**Jake**: That's actually where my junior colleague Jessica struggles most. Accrued expenses has 300-500 transactions monthly. Each needs categorization:
- Professional services accruals
- Cloud/infrastructure costs
- Facilities and utilities
- Employee expense reimbursements
- Contractor payments

She spends **2-3 hours** manually categorizing, building the rollforward, then another **2 hours** writing the variance explanation from scratch.

If the system could auto-categorize based on vendor name, description, prior patterns—that's 80% of the manual work. She fixes the 20% that's wrong and moves on.

---

## Technical Skills & Attempts

**Interviewer**: Do you do any automation yourself?

**Jake**: I've written Python scripts to process CSV exports and do lookups. Nothing fancy—reading Excel, filtering, generating summaries.

But it's fragile. Export format changes, script breaks. I'm the only one who can maintain it.

I've tried ChatGPT to analyze data or draft explanations. Mixed results. It's decent for generic writing but doesn't understand our company specifics or accounting nuances.

---

## Edge Cases Requiring Judgment

**Interviewer**: Where do you really need human expertise?

**Jake**: Lots of places:

**Related party transactions** - if we transact with an entity partially owned by our execs, that needs special disclosure. ERP doesn't know that context.

**Unusual contract terms** - like a customer with 12-month return rights. That impacts revenue recognition timing, but it's buried in legalese.

**Business context** - if revenue dropped 20%, is that bad or expected? Maybe we sunset that product line intentionally. Numbers alone don't tell the story.

**New transactions** - anything the company hasn't done before needs careful analysis, often consultation with auditors.

So yeah, AI can do grunt work, but I need to stay in control of accounting judgments.

---

## Success Criteria

**Interviewer**: How would you know if a solution was working?

**Jake**: If I could finish my reconciliations **a day earlier**. Right now I'm working until midnight on Day 4. If I'm done by end of business Day 3, that's success.

**Fewer questions from Sarah** during review. If I'm submitting complete, well-documented recons first time, that's a win.

**Less dread**. Month-end shouldn't be this painful. If I spend more time on interesting analysis—"Why is revenue trending this way?"—and less on "Where is this PDF?", work is more satisfying.

---

## Closing

**Interviewer**: Final thoughts?

**Jake**: Make it actually intelligent. I don't want a tool that regurgitates data—I can do that with Excel.

I want something that understands context, learns from past closes, does tedious work so I can focus on judgment.

And make it fast. If using the tool is slower than my janky Excel process, I won't use it.
