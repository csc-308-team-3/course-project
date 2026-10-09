# Project Conventions

This document defines how our team creates issues, names branches, makes commits, opens pull requests (PRs), and merges changes into `main`. All contributors should follow these conventions to keep work organized and traceable.

## 1. GitHub Project Board

Our project board uses the following columns:

| Status | Meaning | Action |
| --- | --- | --- |
| **Backlog** | Proposed work that has not yet been prioritized. | Refine the issue and move it to TODO when ready. |
| **TODO** | Prioritized issue ready to be taken on. | Assign yourself before starting. |
| **In progress** | Issue is actively being worked on. | Create the issue branch and keep the issue updated. |
| **In review** | Work is implemented and its PR is open. | Request review and address feedback. |
| **Done** | PR is merged into `main` and the issue is closed. | Confirm the board status and issue closure. |

### Taking on an issue

1. Choose an issue from **TODO**, checking dependencies first.
2. Assign yourself to the issue in GitHub and on the project board (where applicable).
3. Move it to **In progress**.
4. Update local `main`, then create a new branch named after the issue.
5. Implement the issue, make logical commits, and update the requirements checklist as you go.
6. Push the branch, open a PR into `main`, and move the issue to **In review**.
7. Once approved, checks pass, and the team has been notified, merge via a **merge commit**.
8. Close/verify closure of the issue and move it to **Done**.

If an issue is blocked, document the blocker in the issue and notify the team. Do not silently mark blocked work as complete.

## 2. Issue Naming

Use:

`<main-number>-<sub-number>-<short-description>`

- **Main number:** Groups issues under a larger feature or project area.
- **Sub-number:** Identifies a subtask within that group.
- **Short description:** Describes the actual work, using lowercase words separated by hyphens.

Examples:

- `1-1-main-page-backend`
- `1-2-main-page-frontend`
- `1-3-main-page-tests`
- `2-1-user-authentication-backend`
- `2-2-login-page-frontend`

Choose the next available sub-number within the group; never reuse an existing identifier. Keep titles concise and specific. The custom issue identifier is **not** the same as GitHub's automatically assigned issue number (such as `#15`). Use GitHub issue numbers to create links and close issues from PRs.

## 3. Issue Description Conventions and Template

Every issue must include **Overview**, **Dependencies**, **Requirements**, **Acceptance Criteria**, and **Out of Scope**. Create issues with unchecked requirements and check them off as work is completed.

### Overview

Explain what will be implemented and what purpose it serves. Keep the description short and specific.

**Example:** Implement the Cooking Plans frontend so users can create, view, update, and delete plans using the existing Cooking Plan API.

### Dependencies

List prerequisite GitHub issues by **actual GitHub issue number** (`#8`), not just the custom task identifier. Explain what each dependency provides. If there are none, write `None`. A dependency means another task must be completed or its needed interface must be available before this issue can be finished.

**Example:**

- Depends on: `#8` — Cooking Plan API endpoints.
- Depends on: `#3` — Authentication setup.
- Depends on: `#5` — Shared frontend layout.

### Requirements

List actionable implementation work as **unchecked Markdown checkboxes**. Group related work under headings such as `Frontend`, `Backend`, `Testing`, or `Documentation` when useful. Each checkbox should represent something the assignee can implement and check off.

**Example:**

- [ ] Add a form to name a cooking plan and select recipes.
- [ ] Display all cooking plans and their included recipes.
- [ ] Support editing and deleting cooking plans.
- [ ] Handle loading, empty, and error states.
- [ ] Add a shortcut from the recipe detail page to add a recipe to a plan.

### Acceptance Criteria

Describe **observable, testable outcomes**, not implementation steps. A reviewer should be able to verify whether each condition is met.

**Example:**

- A user can create a named cooking plan containing selected recipes.
- A user can view all plans and the recipes in a selected plan.
- A user can rename a plan or change its recipes.
- A user can delete a plan without deleting the underlying recipes.
- The UI displays appropriate feedback when a request fails.

### Out of Scope

Clearly list functionality **not included** in this issue to prevent scope creep. These exclusions can become separate issues later. If no exclusions are necessary, write `None`.

**Example:**

- Implementing or modifying the backend Cooking Plan API.
- Automatically generating grocery lists.
- Meal scheduling or calendar integration.
- Recipe recommendations.

### Issue template (copy when creating a new issue)

The outer fence uses **four backticks** so the three-backtick Markdown block can appear literally in this file.

````markdown
## Overview

[Briefly explain what needs to be implemented and why.]

---

## Dependencies

- Depends on: #<issue-number> — [What this issue provides]
<!-- If none: replace the line above with "None". -->

---

## Requirements

### [Frontend / Backend / Testing / Other]

- [ ] [Actionable implementation requirement]
- [ ] [Actionable implementation requirement]
- [ ] [Actionable implementation requirement]

---

## Acceptance Criteria

- [Specific, verifiable user-facing or technical outcome]
- [Specific, verifiable user-facing or technical outcome]

---

## Out of Scope

- [Explicitly excluded functionality]
- [Explicitly excluded functionality]
````

Optionally save the issue template as `.github/ISSUE_TEMPLATE/task.md` for GitHub's **New issue** template picker. When creating a template file, you can add GitHub issue-template front matter above the content if desired.

## 4. Branch Naming

Use one issue branch per issue, named:

`<type>/<issue-name>`

For example: `feature/1-2-main-page-frontend`.

| Branch prefix | When to use it | Example |
| --- | --- | --- |
| `feature/` | New feature or functionality | `feature/1-2-main-page-frontend` |
| `fix/` | Bug fix | `fix/2-3-login-validation` |
| `docs/` | Documentation | `docs/3-1-update-readme` |
| `test/` | Tests | `test/1-3-main-page-tests` |
| `refactor/` | Code restructuring without behavior changes | `refactor/4-1-simplify-api-handler` |
| `chore/` | Maintenance, configuration, dependency updates | `chore/5-1-configure-eslint` |
| `style/` | Formatting-only changes | `style/6-1-format-components` |
| `perf/` | Performance improvements | `perf/7-1-optimize-query` |
| `ci/` | CI/CD pipeline changes | `ci/8-1-add-github-actions` |

**Rules:** Always branch off an up-to-date `main`. Use lowercase, hyphenated issue names. Keep each branch focused on its issue. Do not commit directly to `main` or work on an unrelated issue in the same branch.

## 5. Commit Messages

Use the following Conventional Commits-style format for **every commit within the branch**:

`<type>: <concise description of what changed>`

| Prefix | Purpose | Example |
| --- | --- | --- |
| `feat:` | New functionality | `feat: implement main page frontend` |
| `fix:` | Bug fix | `fix: correct login form validation` |
| `docs:` | Documentation | `docs: add local development instructions` |
| `test:` | Tests | `test: add cooking plan API tests` |
| `refactor:` | Behavior-preserving code restructuring | `refactor: extract reusable form validation` |
| `chore:` | Maintenance/configuration | `chore: configure eslint` |
| `style:` | Formatting-only changes | `style: format React components` |
| `perf:` | Performance improvements | `perf: reduce unnecessary database queries` |
| `ci:` | CI workflows | `ci: run tests on pull requests` |
| `build:` | Build tooling/dependencies | `build: configure vite` |

**Rules:**

- Use clear, specific, imperative descriptions (`add`, `implement`, `fix`, `remove`), generally starting lowercase.
- Make focused commits representing one logical change. Avoid messages like `stuff`, `updates`, or `final`.
- Review `git diff` and `git diff --staged` before committing; stage only intended files.
- Never commit secrets, environment files containing credentials, dependency directories, or generated artifacts that belong in `.gitignore`.
- Keep tests passing at meaningful checkpoints; commit tests and implementation logically.

**AI assistance:** You may ask an AI assistant:

> Review the staged and unstaged Git changes and propose accurate Conventional Commit messages describing exactly what changed. If changes are unrelated, suggest how to split them into logical commits. Do not run any commits.

Verify the suggestions against the actual diff before committing.

## 6. Pull Request Conventions

All work must be merged into `main` through a PR. **Do not push directly to `main`.**

### Preparing a PR

1. Finish the requirements and verify acceptance criteria.
2. Run relevant tests, linting, and build checks (where available).
3. Review the diff and remove accidental or unrelated changes.
4. Commit and push your issue branch.
5. Incorporate recent changes from `main` as needed and resolve conflicts.
6. Create a PR **from the issue branch into `main`**, with a title such as `feat: implement main page frontend`.
7. Link the issue using `Closes #<actual-GitHub-issue-number>` in the PR description.
8. Move the issue to **In review** and request feedback.

### PR template (copy into the PR description)

````markdown
## Summary

[Briefly explain what this PR implements or changes.]

---

## Related Issue

Closes #<issue-number>

---

## Changes Made

- [Major change]
- [Major change]

---

## Testing

- [ ] Relevant tests pass.
- [ ] Existing functionality has been checked.
- [ ] Tests were added or updated where appropriate.
- [ ] Changes have been reviewed locally.

---

## Additional Notes

[Dependencies, screenshots, limitations, or anything reviewers need to know. Write "None" if not applicable.]

---

## Pre-Merge Checklist

- [ ] PR targets `main`.
- [ ] Branch and commits follow naming conventions.
- [ ] No unrelated changes or unintended files are included.
- [ ] Merge conflicts are resolved and required checks pass.
- [ ] Team has been notified in the group chat before merging.
- [ ] Any required reviews/approvals have been completed.
````

Optionally save this template as `.github/pull_request_template.md` to have it pre-filled automatically when opening PRs.

## 7. PR Reviews and Merging

**Use a merge commit (`Create a merge commit`) — not `Squash and merge` or `Rebase and merge`.** Merge commits preserve the development branch's individual commits and record when the branch was integrated into `main`, making work easier to trace.

### Required merge workflow

1. Open the PR and make sure it targets `main`.
2. Check tests and ensure there are no unresolved conflicts or review concerns.
3. **Before merging, announce the PR in the group chat** so teammates can ask you to wait or raise concerns.
4. Give teammates a reasonable opportunity to respond. If someone flags an issue, resolve it before proceeding.
5. Complete any required review and approval steps.
6. Select **Create a merge commit** on GitHub (not squash/rebase).
7. Confirm the PR was merged, close or verify closure of its linked issue, and move the issue to **Done**.
8. Delete the remote feature branch after merging, then sync your local `main` and remove the old local branch.

**Example group chat message:**

> PR #18 (`feature/1-2-main-page-frontend`) is ready to merge into `main`. I've run the relevant tests. Please let me know if I should wait due to conflicts or concerns before I merge.

Do not merge immediately after announcing if teammates have not had a reasonable chance to raise concerns. A group chat announcement does **not** replace any required GitHub review or checks.

### Merge conflict resolution

If `main` has advanced since you created your branch, merge the latest `main` into **your issue branch** when necessary, resolve conflicts, then re-run tests and push. Coordinate with the people whose work overlaps. Do not blindly accept one side of a conflict or force-push to `main`.

## 8. Testing, Documentation, and Collaboration

- Add or update tests for functionality changes when applicable. For TDD tasks, follow **Red → Green → Refactor** and keep tests passing after refactoring.
- Follow the project's existing formatting, linting, and code organization patterns.
- Update documentation if setup steps, APIs, or expected behavior change.
- Avoid unrelated refactors in feature PRs; open separate issues when appropriate.
- Keep issues, dependencies, and board statuses current; explain blockers in comments.
- Coordinate before changing shared APIs, data schemas, project architecture, or dependencies.
- Never commit credentials or sensitive information. Use a `.env.example` with placeholders when environment variables are required.
- Do not force-push shared branches without coordinating with others.
- Keep PRs small enough to review meaningfully and address feedback constructively.

## 9. Common Git Commands

```bash
# Start a new issue from the latest main
git switch main
git pull --ff-only origin main
git switch -c feature/1-2-main-page-frontend

# Review changes and make a focused commit
git status
git diff
git add <specific-files>
git diff --staged
git commit -m "feat: implement main page frontend"

# Push branch and open a PR on GitHub
git push -u origin feature/1-2-main-page-frontend

# Optional: update your issue branch when main has moved
git fetch origin
git merge origin/main
# If there are conflicts, resolve them, finish the merge, then test and push.
git push

# After the PR is merged on GitHub with 'Create a merge commit'
git switch main
git pull --ff-only origin main
git branch -d feature/1-2-main-page-frontend
```

> **Reminder:** The intended flow is **Backlog → TODO → In progress → In review → Done**, with issue assignment, branching, commits, PR review, group chat coordination, and a merge commit along the way.
