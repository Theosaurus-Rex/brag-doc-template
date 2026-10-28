---
name: brag
description: Log a new career achievement into this repo as an achievement file. Use when the user says /brag or describes something they did at work that they want to record.
---

# Log an achievement

Read `README.md` (Data model) if you haven't this session.

If `git config core.hooksPath` isn't `.githooks`, tell the user to run `bun run setup` so commits are checked for client names.

1. Take the user's rough description.
2. Work out where it belongs. List `roles/*/projects/*/project.md` and match on name and client descriptor. If it isn't project work, it goes in `roles/<employer>/achievements/`. If it's a new project, propose a `project.md` (generic name, client descriptor, dates, role, tech) and confirm it with one `AskUserQuestion`. Then append `<project-slug>: <real client name>` to `private/clients.yaml`, and the real name plus any codenames or people the user mentioned to `private/denylist.txt`. Create either file if missing.
3. Ask only for what is missing: the measurable impact, the month (`YYYY-MM`), which project if unclear, and anything the story needs, such as whether the user led it or where it is now. Don't ask about anything you can infer.
   - Use `AskUserQuestion` with one question per call, so the user can click an answer, not type an essay. Wait for each answer before asking the next.
   - Give 2–4 options built from what the user said. Add a "Not sure" option where it fits; choosing it means a `Follow-up:` line.
   - The user can type their own answer instead. Read it carefully and act on it.
4. Pick 1–3 tags from `taxonomy.yaml` only.
5. **Anonymise.** Read `private/denylist.txt` and `private/clients.yaml`. If either is missing, ask the user for the real client name and sensitive terms, create the files, and don't proceed unchecked. If the user named a client, codename or person, replace it with the project's descriptor or a role ("a product owner"). Never write a denylisted term to a tracked file.
6. Write `<YYYY-MM>-<short-slug>.md`:
   - `headline`: a one-line summary of what you did and the result, under about 20 words, starting with a strong verb.
   - `impact`: the numbers, if there are any.
   - `## Story`: situation, what the user did, result, in plain sentences.
   - `## Notes`: anything uncertain. For anything the user still needs to supply, such as impact, outcome or the month, add a line starting `Follow-up:` so `/brag-followups` can find it.
7. Run `bun run check` and fix anything it reports.
8. If a rubric is present (`private/rubric/` has any file), read it directly, whatever its format. Then say in one chat line which rubric themes or competencies this looks like evidence for. Don't write it to the file.
9. Print a block for the user to paste into their Notion brag doc. Here the **real** client name from `private/clients.yaml` is allowed, because Notion is internal. Include the date, project, headline, impact and story. Use a day date if one is known, or a range for work spread over weeks. Don't write this block to any file. This is a stopgap while your team still uses Notion. Skip this step if the user doesn't use Notion.
10. Don't commit unless the user asks.

Never invent impact or numbers. If the user doesn't know, leave `impact` out.
