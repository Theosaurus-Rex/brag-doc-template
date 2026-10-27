---
name: review-pack
description: Use when the user says /review-pack, or asks for a review cycle doc, performance review prep, or a doc for my manager. Builds a doc from a period of achievements for the manager to read before the formal review 1:1. Argument is the period, e.g. 2026-04..2026-09 or "since my last review".
---

# Build a review doc for your manager

Read `README.md` (Data model) if you haven't this session.

The manager reads this before booking the formal review 1:1. They want specific examples: unblocking teammates, improving team processes, and flagging dependencies before they became problems. Lead with those wherever the achievements show them.

## Inputs

- **Period:** from the argument, as `YYYY-MM..YYYY-MM`. "Since my last review" means from the date of the newest file in `private/reviews/` to now. If there is no such file, ask for the start month. If there is no argument, ask.
- **About you:** read `private/me.yaml` (`name`, `role`, `level`). If it is missing or incomplete, ask once for what is missing and write the file. Create `private/` if needed.
- **Rubric:** a rubric is present if `private/rubric/` has any file. If so, read it directly, whatever its format. No parser.
- **Real names:** read `private/clients.yaml` (`<project-slug>: <real name>`).

## Process

1. Collect achievements dated in the period, from `roles/*/achievements/` and `roles/*/projects/*/achievements/`.
2. With a rubric, map each achievement to the rubric themes and competencies it shows evidence for, at the person's level and the next one up. Without one, group by taxonomy tag.
3. Restore real names. Replace each project's generic client descriptor with the real name from `private/clients.yaml`. This doc is internal.
4. Draft the doc and show it in chat.
5. Iterate with the user until they are happy. Then write the file and render it.

## Doc layout

1. **Header:** name, role and level, review period.
2. **Summary:** one short paragraph on the period.
3. **One section per rubric theme**, or per taxonomy tag if there is no rubric. Aim for 2-5 examples; use fewer if that's all the evidence supports. Don't pad. Each example gives the situation, what the person did, the result, and which competency it shows (with a rubric). Use the story and `impact` from the achievement file. Put each achievement in one section only, the best fit. Leave out a theme with no evidence.
4. **Growth:** where they want to grow, and gaps against the next level. Ask the user where they want to grow, and don't write that part until they answer. With a rubric, a gap is a competency with no evidence in the period. Without one, skip the gaps and keep what the user tells you.
5. **Talking points:** two or three suggestions for the 1:1.

## Rules

- Never invent impact. Use only numbers and outcomes in the achievement files or from the user.
- If an example has no `impact` and no clear result in its story, flag it in chat and suggest running `/brag-followups` first. Keep it out of the doc unless the user says to include it.
- Write only to `private/reviews/<YYYY-MM-DD>-review.md` (today's date), plus `private/me.yaml`. Never write the doc to a tracked file. Real names are allowed there.
- Don't run the denylist check on the output. It is meant to contain real names.
- Never quote the rubric text into the doc. Name only the themes and competencies the person needs.

## Finish

Write the file, then run `bun run review private/reviews/<YYYY-MM-DD>-review.md`. This renders a PDF next to it. Tell the user the PDF is the file to send their manager. If Typst isn't installed, the command says how to install it, and the Markdown still stands on its own.

Don't commit anything. `private/` is gitignored.
