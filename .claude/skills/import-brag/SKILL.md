---
name: import-brag
description: Repeatable import of a Notion brag doc export into this repo's role/project/achievement files, anonymising client names. Use when the user says /import-brag or wants to import their Notion brag doc.
---

# Import the Notion brag doc

Read `README.md` (Data model) first.

**Prerequisite:** the user has exported the Notion database (⋯ → Export → Markdown & CSV) and unzipped it into `private/import/`, and copied `examples/private/*` into `private/` if they haven't already. If `private/import/` is empty, tell them how to do this and stop.

The export contains real client names. It lives in `private/`, which is gitignored. Never copy raw text from it into a tracked file without anonymising it first.

1. **Read the export.** Read whatever CSV and Markdown pages are in `private/import/`. Layouts differ, so infer which columns are title, date, tags, project and body. State the inferred mapping in the step-3 plan.
2. **Ask for role details** if `roles/` is empty: employer, current title, start month, and any earlier titles at the same employer. Also ask for earlier employers they want included.
3. **Propose a plan in one message:**
   - **Column mapping:** which column you took as title, date, tags, project and body.
   - **Projects:** which Notion tags are really projects. For each, give a slug, a generic `name`, a `client` descriptor (industry and scale, e.g. "an ASX-listed insurer"), the date range from its entries, the user's likely role, and the tech.
   - **Tag mapping:** each remaining Notion tag or category mapped to `taxonomy.yaml` tags, or dropped. Propose new taxonomy entries only if something important doesn't fit.
   - **Entries you can't place**, and anything that looks too confidential to keep even when anonymised.
   - **Denylist:** every real client name, codename and person's name you found.
   Wait for approval and apply any corrections.
4. **Write private files first:**
   - `private/denylist.txt`: one term per line
   - `private/clients.yaml`: `<project-slug>: <real client name>`
5. **Write content files:**
   - `roles/<employer>/role.md`
   - `roles/<employer>/projects/<slug>/project.md`
   - one achievement file per entry, in the format `/brag` uses: a `headline` (a one-line summary of what you did and the result, under about 20 words, starting with a strong verb), `impact` only from real numbers in the entry, and `## Story` rewritten from the entry with every denylisted term replaced
   - role-level entries go in `roles/<employer>/achievements/`
6. Run `bun run check` and fix everything it reports.
7. **Summarise:** counts of roles, projects and achievements, a few sample headlines to spot-check, and any entries you skipped. If `roles/example-co/` still exists, offer to delete it. Remind the user to review the content before ever making the repo public.

This skill can be run again later for a fresh export. On a rerun, skip entries that already exist, matched on month plus a similar headline or story, and list what was skipped.

Don't commit unless the user asks.
