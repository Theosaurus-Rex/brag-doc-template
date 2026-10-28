---
name: brag-scan
description: Use when the user says /brag-scan, or asks what they've done recently that's worth a brag, wants brag suggestions from their GitHub, Linear or Slack history, or wants recent work matched to existing achievements. Optional argument is the period, default the last 30 days.
---

# Suggest brags from GitHub, Linear and Slack

Read `README.md` (Data model) and `.claude/skills/brag/SKILL.md` if you haven't this session. Then read `private/denylist.txt`, `private/clients.yaml` and `private/sources.yaml`. If `sources.yaml` is missing, this is the first run. Ask which sources the user has (e.g. github, linear, slack), in one message, and write the file. A rubric is present if `private/rubric/` has any file. If so, read it directly, whatever its format.

**Rule: the raw data stays out of tracked files.** PR titles, repo names, ticket IDs, Linear team and project names, Slack channel names, message text and colleagues' names all identify clients. Show them in chat as evidence. Write only anonymised text to the repo.

## 1. Gather

Query only the sources listed under `sources:` in `sources.yaml`. Start date: from the argument, or `date -v-30d +%F` (macOS).

**GitHub** (`gh`, already authenticated). Keep output to one line per PR:
- Authored: `gh search prs --author=@me --created=">=<since>" --limit 300 --json repository,number,title,state,closedAt --jq '.[] | "\(.repository.nameWithOwner)#\(.number) [\(.state)] \(.title)"'`
- Reviewed: the same with `--reviewed-by=@me --updated=">=<since>"`.
- If a search returns exactly the limit, split the period in half and search each half.
- For notable PRs only: `gh pr view <url> --json body,additions,deletions`.
- Skip repos listed under `ignore` in `sources.yaml`, and this repo.
- An open PR hasn't shipped. Say so in the proposal, and use its merged child PRs or done tickets as the evidence.

**Linear** (MCP tools are deferred, so load them first with ToolSearch, e.g. `select:mcp__claude_ai_Linear__list_issues,mcp__claude_ai_Linear__list_projects`):
- `list_issues` with `assignee: "me"`, `updatedAt` set to the period (e.g. `-P30D`), `limit: 100`, and fields `title, status, completedAt, createdAt, project, team, parentId`. Follow `cursor` while `hasNextPage` is true.
- The same with `creator: "me"`. Tickets you wrote are evidence of scoping and planning.
- `updatedAt` also returns old issues that were only touched recently. Keep an issue only if its `completedAt` or `createdAt` falls in the period. De-duplicate the two lists by id.
- `list_projects` for the projects these issues belong to. If you're the project lead, the headline can say "Led". Otherwise say what you built.

**Slack** (load the tools with ToolSearch, e.g. `+slack search`). If only `authenticate` tools come back, Slack isn't connected. Say so, offer to start the sign-in, and carry on without it.
- Search your own messages in the period, e.g. `from:@me after:<since>`. Look for threads you started: proposals, announcements, demos, write-ups and decisions. Read the replies on the promising ones.
- Search for praise: messages that mention you and say thanks, kudos, great work or similar.
- Skip `channels` listed under `ignore` in `sources.yaml`.
- Slack is the best evidence of leadership and influence: initiatives you started, trade-offs you put to the team, and how others responded. Use it mainly to enrich candidates from GitHub and Linear. A thread can be its own candidate, e.g. a process change or a talk.
- Paraphrase in tracked files, e.g. "praised by the tech lead". Never quote a message.

If the user pastes a Slack thread, treat it the same way.

If a source fails or isn't connected, say so and carry on with the others.

## 2. Map sources to projects

`private/sources.yaml` lists the sources to query, maps each GitHub repo, Linear team and Slack channel to a project slug, and ignores the rest:

```yaml
sources: [github, linear, slack]
github:
  some-org/client-app: client-project-slug
linear:
  TEAM: client-project-slug
slack:
  client-project-channel: client-project-slug
ignore:
  - someone/side-project
  - random
```

For anything unmapped, guess a project slug from `roles/*/projects/` (match on client and tech), or `role` for internal employer work, and carry on with that guess. List the guesses at the top of the step-5 message, and confirm them in step 6. Write `sources.yaml` once they're confirmed.

Personal repos (under the user's own account, not an employer's) don't belong to any role. List them separately in step 5, and in step 6 ask whether to skip them (add them to `ignore`) or keep them for later. Don't let a side project's PR count crowd out work candidates.

If a new client appears, follow `/brag` step 2 to propose a new `project.md`.

## 3. Cluster into candidates

Group the activity into things a brag could say, not one per PR. A candidate is one of:
- an epic, Linear project or milestone you owned, shipped or moved forward
- a cross-cutting improvement, such as tooling, DX, tests or process
- scoping and leadership: many tickets written, design or architecture tickets, a QA round run, or many reviews on a teammate's epic
- a fix or feature with clear user or business impact

If a rubric is present, prefer candidates that show rubric behaviours, such as unblocking others, improving process or raising risks early. Name the competency in the proposal.

Drop routine singletons such as small fixes and dependency bumps, unless they had visible impact. A candidate's month is the month it was completed. If it isn't done, use the month with the most activity.

## 4. Match against existing achievements

For each candidate, read the achievements under the mapped project (or `roles/<employer>/achievements/` for `role`) dated in or near the period. Also check their `Follow-up:` lines. Classify each candidate:

- **NEW**: nothing covers it
- **ENRICH**: an existing achievement covers it, and this adds detail, scope or a number
- **RESOLVES FOLLOW-UP**: the activity answers an open `Follow-up:` line, e.g. an in-progress epic is now done
- **COVERED**: already fully captured, so it isn't listed

## 5. Propose, in one message

1. Source mapping guesses, and personal repos.
2. Candidates, numbered. For each: kind, project, month, a draft headline (one-line summary: strong verb, concrete result, under about 20 words), evidence (PR and ticket references, counts, Slack threads), the existing file if it's ENRICH or RESOLVES, and what's missing, usually the impact or whether you led it.

Put no questions in this message. Step 6 asks them.

Counts from the data (tickets shipped, PRs reviewed) are facts, but they rarely make a good `impact`. Use one only if the user agrees. Never invent or estimate impact.

## 6. Ask, one question at a time

Use `AskUserQuestion` with one question per call, so the user can click an answer, not type an essay. Wait for each answer before asking the next.

- Give 2–4 options built from the evidence: the likely answers, not generic ones. Add a "Not sure" option where it fits; choosing it means a `Follow-up:` line.
- The user can type their own answer instead. Read it carefully. It often adds detail or changes the plan, e.g. "1 and 3", "also merge it with X", or a fact you didn't know. Act on it, and ask a short follow-up question if it's unclear.
- Don't ask what the data or an earlier answer already settles.

Order:
1. Mapping guesses (one question, confirm or correct), then personal repos (skip or keep).
2. New terms for the denylist: codenames or people's names seen in Linear, GitHub or Slack. Ask whether each is internal or generic enough to keep.
3. For each candidate in turn:
   - Keep, skip, or merge into another candidate or an existing file.
   - Then up to about 4 questions on what's missing. Typical ones:
     - the problem it solved
     - the decision you're proudest of
     - how it was built: solo, leading others, or with an AI agent
     - where it is now: live, demoed or not deployed
     - the impact
     - for ENRICH or RESOLVES, whether to change the headline
4. Once, near the end: whether counts from the data may be used as `impact`.

## 7. Write what the user approves

First update the private files:
- `sources.yaml` with the confirmed mappings and ignores.
- `denylist.txt` with any new client names, people, or distinctive codenames. The leak check matches whole words, case-insensitively. So don't add generic Linear project names like "Search" or "Settings page", which would flag normal phrases. Never write those project names or any ticket IDs in a tracked file. Run `bun run check` right after editing the denylist, to catch any term that now flags existing files.

Then:
- **NEW**: follow `/brag` steps 4–9 (tags, anonymise, write the file, check, rubric note, Notion paste block). If the impact or outcome is still unknown, add a `Follow-up:` line to `## Notes`.
- **ENRICH / RESOLVES**: edit the existing file. Add to `## Story` and update `impact` with numbers the user gave. Change `headline` only if the user agrees. Remove a `Follow-up:` line once it's fully answered. If it's only partly answered, rewrite it to say what is still missing. If the month changes, rename the file.
- **MERGE**: if the user folds existing achievements into a new one, carry over their story and any open `Follow-up:` lines. Then delete the old files.

In the Notion paste blocks, use day dates, such as when the Linear project was completed or the PR merged. Use a range for work spread over weeks. The repo files stay at `YYYY-MM`.

Run `bun run check` and fix what it reports. Don't commit unless the user asks.
