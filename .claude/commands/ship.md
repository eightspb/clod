---
allowed-tools: Bash(git checkout:*), Bash(git add:*), Bash(git status:*), Bash(git push:*), Bash(git commit:*), Bash(git log:*), Bash(git diff:*), Bash(git branch:*), Bash(git merge:*), Bash(gh pr create:*), Bash(gh pr merge:*), Bash(gh pr view:*), Bash(gh pr list:*)
description: Commit with detailed message, push, create PR, and merge to main
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits for style reference: !`git log --oneline -5`
- Existing PR for this branch: !`gh pr view --json number,title,state,url 2>/dev/null || echo "no PR"`

## Your task

Based on the above context, perform ALL of the following steps. Use parallel tool calls where possible. Do NOT ask for confirmation — execute everything.

### Step 1: Commit (if there are uncommitted changes)

1. Stage all changes: `git add -A`
2. Analyze the full diff to understand WHAT changed and WHY
3. Write a **detailed** commit message following this format:

```
<short summary line — what and why, under 72 chars>

<blank line>
<detailed body — bullet points describing each logical change>
<group related changes together>
<mention files/areas affected>
```

Use a HEREDOC to pass the commit message:
```bash
git commit -m "$(cat <<'EOF'
Short summary line

- First logical change described
- Second logical change described
- ...
EOF
)"
```

Rules for the commit message:
- Summary line: imperative mood ("Add X", "Fix Y", "Remove Z"), under 72 chars
- Body: one bullet per logical change, grouped by area
- Mention the "why" when it is not obvious from the "what"
- Do NOT list every single file — describe behavior changes
- Russian content changes can use Russian in the body

### Step 2: Push

- If on `main`: create a new branch first (`git checkout -b <descriptive-branch-name>`)
- Push the branch to origin: `git push -u origin <branch>`

### Step 3: Create PR

- Use `gh pr create` with a clear title (under 70 chars) and a body
- Base branch: `main`
- PR body format (use HEREDOC):

```bash
gh pr create --title "PR title" --body "$(cat <<'EOF'
## Summary
<2-5 bullet points describing the changes>

## Changes
<grouped list of what was done>

## Validation
- [ ] `bun run lint` — passed
- [ ] `bun run test:run` — passed
- [ ] `bun run build` — passed
EOF
)"
```

### Step 4: Merge

- Merge the PR: `gh pr merge --squash --delete-branch`
- If the PR has a single logical change, use `--squash`
- If the PR has multiple meaningful commits worth preserving, use `--merge`
- Confirm success after merge

## Rules

- Do ALL steps in one pass, do not pause between steps
- If working tree is clean and a PR already exists — skip to merge
- If already on `main` with no changes — say "nothing to ship"
- After merge, print the merged PR URL
