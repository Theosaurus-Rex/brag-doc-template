---
name: brag-followups
description: Use when the user says /brag-followups, asks which brags or achievements still need follow-up, are incomplete, are missing impact or outcomes, or wants to tidy up their brag files.
---

# Flag brags that need follow-up

Read `README.md` (Data model) if you haven't this session.

A follow-up is a line in an achievement's `## Notes` that starts with `Follow-up:`. `/brag`, `/brag-scan` and `/import-brag` write these when something is still unknown.

## 1. Find them

- **Explicit:** `grep -rn "^Follow-up:" roles`.
- **Missing impact:** any achievement dated in the last 12 months with no `impact` field. It has no follow-up line, so write the question from its headline and story.
- **Stale in-progress:** a follow-up containing "in progress" whose `date` month is two or more months before the current month. It has probably finished by now.

## 2. Report, in one message

Put each achievement in one group only, the first that applies:

1. Missing impact, or with a follow-up
2. Stale in-progress
3. Everything else with a follow-up, newest first

One table per group, with numbered rows running across all groups so the user can pick by number. Columns: #, file, headline, and what's missing. Finish with counts per group. Put no questions in this message. Step 3 asks them.

## 3. Resolve, if the user wants to

First ask which rows to work through: all of group 1, all of groups 1–2, everything, or specific numbers.

Then work through them in order. Use `AskUserQuestion` with one question per call, so the user can click an answer, not type an essay. Wait for each answer before asking the next.

- Give 2–4 options built from the file's story and Notes, e.g. "Shipped to production", "Demoed, not live yet", "Cancelled". Add a "Not sure" option; choosing it keeps the `Follow-up:` line.
- The user can type their own answer instead. Read it carefully. It often adds detail or changes the plan. Act on it, and ask a short follow-up question if it's unclear.
- Ask up to about 3 questions per row, e.g. the outcome, the impact, and whether to change the headline. Don't ask what an earlier answer already settles.
- For rows that only need a month confirmed, ask one question listing them all, near the end.

For each answer:

- Update `impact` only with numbers the user gives. Never invent or estimate.
- Update `## Story` with the outcome. Change `headline` only if the user agrees.
- Delete the `Follow-up:` line. Delete `## Notes` if it is now empty. If the user only partly answered, rewrite the line to say what is still missing.
- Anonymise as `/brag` does: read `private/denylist.txt` and never write a denylisted term. Replace client names and people with descriptors and roles.

Then run `bun run check` and fix what it reports. For each updated entry, print a block the user can paste into their Notion brag doc, as `/brag` step 9 describes. Don't write that block to a file.

Don't commit unless the user asks.
