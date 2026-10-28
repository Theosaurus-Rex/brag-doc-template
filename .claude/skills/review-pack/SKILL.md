---
name: review-pack
description: Use when the user says /review-pack, or asks for a review cycle doc, performance review prep, or a doc for my manager. Builds a doc from a period of achievements for the manager to read before the formal review 1:1. Argument is the period, e.g. 2026-04..2026-09 or "since my last review".
---

# Build a review doc for your manager

Read `README.md` (Data model) if you haven't this session.

The manager reads this before booking the formal review 1:1. They want specific examples: unblocking teammates, improving team processes, and flagging dependencies before they became problems. Lead with those wherever the achievements show them.

## Inputs

- **Period:** from the argument, as `YYYY-MM..YYYY-MM`. "Since my last review" means from the date of the newest `.yaml` file in `private/reviews/` to now. If there is no such file, ask for the start month. If there is no argument, ask.
- **About you:** read `private/me.yaml` (`name`, `role`, `level`). If it is missing or incomplete, ask once for what is missing and write the file. Create `private/` if needed.
- **Rubric:** a rubric is present if `private/rubric/` has any file. If so, read it directly, whatever its format. No parser.
- **Real names:** read `private/clients.yaml` (`<project-slug>: <real name>`).

## Process

1. Collect achievements dated in the period, from `roles/*/achievements/` and `roles/*/projects/*/achievements/`.
2. With a rubric, map each achievement to the rubric themes and competencies it shows evidence for, at the person's level and the next one up. Without one, group by taxonomy tag.
3. Restore real names. Replace each project's generic client descriptor with the real name from `private/clients.yaml`. This doc is internal.
4. Draft the doc in chat as a readable table per theme (Work, Result, Shows) before writing the file.
5. Iterate with the user until they are happy. Then write the file and render it.

## Doc layout

The doc is a YAML file, rendered as a header, three summary bullets, a level key, one evidence table grouped by theme, then gaps and 1:1 asks side by side.

```yaml
name: "Sam Example"
role: "Engineer"
level: "Level 3"
employer: "Example Co"
period: "April 2026 to September 2026"
summary:
  - "..."
levels:
  - "L3"
  - "L4"
  - "L4 stretch"
themes:
  - name: "Delivering Outcomes"
    examples:
      - title: "Checkout revamp"
        client: "Example client"
        date: "Jul 2024"
        detail: "..."
        result: "..."
        shows:
          - name: "Supporting others' delivery"
            level: "L4"
gaps:
  - name: "Security"
    note: "..."
asks:
  - title: "Level 4 readiness"
    text: "..."
```

- **Header:** `name`, `role`, `level` and `period` come from `private/me.yaml` and the argument. `employer` is optional.
- **`summary`:** three bullets, each under about 15 words.
- **`themes`:** one per rubric theme, or per taxonomy tag if there is no rubric. Leave out a theme with no evidence. Put each example in one theme only, the best fit. Aim for 2-5 examples per theme; use fewer if that's all the evidence supports. Don't pad.
- **`detail`:** the situation and what the person did, from the achievement's story. 1-4 sentences, first person.
- **`result`:** from the achievement's `impact` or the story's outcome. Leave it out if there is none; don't fill it with a restatement.
- **`shows`:** the competencies the example gives evidence for. Each has a `level` that must be one of `levels`.
- **`levels`, with a rubric:** the person's level, the next one up, and the next level's stretch competencies if the rubric has them, e.g. `["L3", "L4", "L4 stretch"]`. Up to four labels, lowest first.
- **Without a rubric:** leave out `levels`, use taxonomy tags as themes, and let `shows` list tags with no level.
- **`gaps` and `asks`:** where they want to grow, and gaps against the next level. Ask the user where they want to grow first, and don't write these until they answer. With a rubric, a gap is a competency with no evidence in the period. Without one, skip the gaps and keep what the user tells you. `asks` are two or three suggestions for the 1:1.

### YAML hygiene

Use block style only, no `{...}` flow maps. Double-quote every string value, so commas and colons don't cut the text short.

## Rules

- Never invent impact. Use only numbers and outcomes in the achievement files or from the user.
- If an example has no `impact` and no clear result in its story, flag it in chat and suggest running `/brag-followups` first. Keep it out of the doc unless the user says to include it.
- Write only to `private/reviews/<YYYY-MM-DD>-review.yaml` (today's date), plus `private/me.yaml`. Never write the doc to a tracked file. Real names are allowed there.
- Don't run the denylist check on the output. It is meant to contain real names.
- Never quote the rubric text into the doc. Name only the themes and competencies the person needs.

## Finish

Write `private/reviews/<YYYY-MM-DD>-review.yaml`, then run `bun run review private/reviews/<YYYY-MM-DD>-review.yaml`. Fix any issues it reports and run it again. This renders a PDF next to the file. Tell the user the PDF is the file to send their manager. If Typst isn't installed, the command says how to install it, and the YAML still stands on its own.

Don't commit anything. `private/` is gitignored.
