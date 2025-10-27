# Agent Instructions

Project-specific conventions for GitHub issue management in `pranitl/leads-website`.

## Project Setup

- **Primary Project**: "Lead Website Roadmap" (Project #1)
- **Auth**: `gh auth refresh -s read:project,project -h github.com` (use `project`, NOT `write:project`)

## Issue Structure

### Parent Issues (Epics)

```markdown
## Goal
[High-level objective]

## Overview
[Context and scope]

## Sub-tasks
- [ ] https://github.com/pranitl/leads-website/issues/3 - [Description]
- [ ] https://github.com/pranitl/leads-website/issues/4 - [Description]

## Success Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
```

**Critical**: Use full URLs in tasklists (not `#3`) for auto-tracking.

### Sub-Issues

```markdown
## Description
[What this accomplishes]

## Tasks
- [ ] [Task 1]
- [ ] [Task 2]

## Acceptance Criteria
- [ ] [Criterion 1]

## Related
Part of #[parent-issue-number]
```

## Workflow

1. Create parent issue with `enhancement` label
2. Create all sub-issues with same label
3. Update parent issue tasklist with full URLs to sub-issues
4. Add ALL issues (parent + children) to project:

   ```bash
   gh project item-add 1 --owner pranitl --url https://github.com/pranitl/leads-website/issues/[N]
   ```

## Key Conventions

- All deployment/feature issues tagged with `enhancement`
- Sub-issues reference parent with "Part of #X"
- Always add both parent and sub-issues to the project
- Use full URLs in parent tasklists for GitHub tracking

## Git Commits
For each thing in the todo list you have, ensure you commit often so that we are able to track work. Use standard commit messages which are detailed and start with best practices like docs: fix:, feat: bug: chore: etc.