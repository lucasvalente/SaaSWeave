---
name: rbac-review
description: Run the rbac-review governance checkpoint.
version: 1.0.0
author: Saasweave team, Hermes Agent
license: MIT
platforms: [windows, linux, macos]
metadata:
  hermes:
    tags: [project-governance]
    category: engineering
---

# rbac-review Skill

Composable governance checkpoint for this project concern.

## When to Use

Use before or after bounded Codex work.

## Prerequisites

Read `.hermes/project-context.md`, `.hermes/rules.md` and `.hermes/state/project-state.json`. Use Hermes `read_file`, `search_files` and `terminal` tools.

## How to Run

Follow the relevant `.hermes/workflows/` document and capture commands and outputs.

## Quick Reference

Inputs: objective, state, paths and invariants. Output: evidence-backed finding or handoff.

## Procedure

1. Identify scope and completed modules.
2. Inspect relevant files and dependencies.
3. Take the smallest verifiable action or produce a Codex handoff.
4. Record concrete failures; never infer success.

## Pitfalls

Do not expose secrets, alter unrelated business logic or broaden scope.

## Verification

Name files, commands, exit status and remaining risks.
