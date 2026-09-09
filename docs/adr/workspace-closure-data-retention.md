# ADR: Workspace closure and data retention

## Decision

Workspace is the canonical tenant and is never hard-deleted in V1. Administrative suspension is the only lifecycle control in this phase: customer reads remain available, while operational mutations are blocked by the shared workspace guard.

## Future work

A closure or LGPD deletion workflow must define export, retention windows, audit retention, backups, projects, secret references, billing records, and legal holds before any deletion capability is introduced. Ownership transfer is also deferred because it affects projects, billing, permissions, and legal account ownership.
