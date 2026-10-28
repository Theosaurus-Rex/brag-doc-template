# Brag doc template

A place to keep your brag doc as plain files, so Claude can help you log wins, find the ones you forgot and turn them into a doc for your review. It is a starting point for the fortnightly brag doc working group. Most of us keep a brag doc in Notion today, and this picks up from there.

## Setup

1. Click "Use this template" on GitHub. Make your copy private if you prefer.
2. Clone your copy.
3. Install and set up. You need Bun and Claude Code. Typst is optional, for the PDF.

```sh
bun install
bun run setup        # installs the pre-commit hook
mkdir -p private/import
cp examples/private/clients.example.yaml private/clients.yaml
cp examples/private/denylist.example.txt private/denylist.txt
```

`private/` is gitignored. Everything real stays there.

`/brag-scan` asks which sources you use the first time you run it, and writes `private/sources.yaml`. `examples/private/sources.example.yaml` shows the format.

To make the review PDF, install Typst: `brew install typst`.

`/brag-scan` needs `gh` signed in for GitHub (`gh auth login`), the Linear connector in Claude Code for Linear, and the Slack connector in Claude Code for Slack.

## First 15 minutes

1. In Notion, open your brag doc and choose ⋯ → Export → Markdown & CSV.
2. Unzip the export into `private/import/`.
3. Run `/import-brag` in Claude Code. Check the mapping it proposes before it writes anything.
4. Read through the new files in `roles/`. Fix anything that looks wrong.
5. Delete the example employer: `rm -r roles/example-co`.
6. Run `bun run check`.
7. Run `/brag-scan` to find recent work you have not logged yet.

## Your career rubric

Optional. Drop your company's career rubric into `private/rubric/`, in any format (HTML, PDF, Markdown). `/brag-scan` and `/review-pack` read it and match your work to its competencies.

## Before a review

1. `/brag-followups` to fill in missing impact and open follow-ups.
2. `/review-pack 2026-04..2026-09` to build a review doc for your manager. It is saved in `private/reviews/`.
3. `bun run review private/reviews/<file>` to render it as a PDF. Paths are relative to the repo root, e.g. `bun run review private/reviews/2026-10-28-review.md`.

## Skills

| Skill | Does |
|---|---|
| `/import-brag` | Import your Notion export into role, project and achievement files. Can be re-run for a fresh export. |
| `/brag` | Log a new achievement |
| `/brag-followups` | List achievements with open `Follow-up:` notes or missing impact, and resolve them |
| `/brag-scan [period]` | Suggest new brags from recent GitHub, Linear and Slack activity, or match it to existing ones (default: last 30 days) |
| `/review-pack <period>` | Build a doc for your manager from a period of achievements |

## Commands

| Command | Does |
|---|---|
| `bun run check` | Validate everything, including the leak check |
| `bun run review <file>` | Render a review doc to PDF (needs Typst) |
| `bun test` | Run tests |
| `bun run setup` | Install the pre-commit hook |

## Data model

Every content file is Markdown with YAML front matter. Dates are quoted `"YYYY-MM"` strings.

### `taxonomy.yaml`

A fixed list of generic category tags, each with a one-line meaning:

```yaml
delivery: Shipping features or projects end to end
performance: Speed, efficiency, cost
mentoring: Growing other engineers
```

Edit the list to suit you. Tags not in this file fail `bun run check`.

### `roles/<employer>/role.md`

```yaml
employer: Example Co
title: Software Engineer
start: "2024-01"
end: present            # or "YYYY-MM"
history:                # optional earlier titles at this employer
  - { title: Junior Engineer, start: "2022-03", end: "2023-12" }
```

Body: short role summary. The employer is named. Clients are not.

### `roles/<employer>/projects/<slug>/project.md`

```yaml
client: a mid-sized online retailer    # descriptor only
name: Checkout revamp                  # generic name, never an internal codename
start: "2024-02"
end: "2024-08"                         # or present
role: Full-stack engineer
tech: [React, TypeScript, Node.js]
```

Body: one paragraph of context. What the project was and why it mattered.

### `achievements/<YYYY-MM>-<slug>.md`

One per achievement, under a project or directly under the role.

```yaml
date: "2024-07"
headline: Cut checkout page load from 6 seconds to 2
tags: [performance, delivery]
tech: [React]                          # optional, added to the project's tech
impact: Drop-off fell by a fifth       # optional
links: []                              # optional, public links only
```

`headline` is a one-line summary of what you did and the result, under about 20 words, starting with a strong verb.

Body sections:

- `## Story`: situation, action, result.
- `## Notes`: a scratchpad for things not yet worth a headline.

A line starting `Follow-up:` marks something to come back to. `/brag-followups` finds these.

## Structure

- `roles/`: your employers, projects and achievements. `roles/example-co/` is an example. Delete it after import.
- `taxonomy.yaml`: the allowed tags
- `template/review.typ`: the review PDF design
- `examples/private/`: example files to copy into `private/`
- `private/` (gitignored): `clients.yaml`, `denylist.txt`, `sources.yaml`, `me.yaml`, `import/`, `rubric/`, `reviews/`

## Anonymisation

Client names are often under NDA. Never write a real client name, internal codename or colleague's name in any tracked file. Describe clients generically, e.g. "a national energy retailer". List the real names in `private/denylist.txt`. `bun run check` and the pre-commit hook fail if any of them appear in the repo. Real names go back into review docs only, which stay in `private/reviews/`.
