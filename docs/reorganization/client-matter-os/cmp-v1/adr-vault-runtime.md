# ADR-CMP-R4-001: Vault Runtime Boundary

Status: Proposed
Date: 2026-06-20

## Context

CMP R4 treats metadata-only DMS evidence as a blocker. Vault must own object storage, version/hash lineage, legal hold, search ACL, email filing, HR document envelope, and RAG source evidence.

## Decision

Vault/DMS is the canonical owner for Document, DocumentVersion, FileObject, storage adapter, search evidence, and document-derived AI source evidence.

## Consequences

- Matter, HRX, Portal, and AI reference Vault objects instead of storing document bodies.
- Raw storage paths never appear in API/UI responses.
- Legal hold and privilege labels bind before delete/search/AI retrieval.
