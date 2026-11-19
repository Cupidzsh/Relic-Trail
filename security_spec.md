# Security Specification & Threat Model — Relic Trail

## 1. Data Invariants
1. **Identity Integrity**: Every document in `/users/{userId}`, `/users/{userId}/matches/{matchId}`, `/leaderboard/{userId}`, and `/round_entries/{entryId}` must belong exclusively to `request.auth.uid`, and `request.auth.token.email_verified == true` is required for all writes.
2. **Master Gate on Subcollections**: `/users/{userId}/matches/{matchId}` requires `exists(/databases/$(database)/documents/users/$(userId))` on create and read.
3. **Immutable Ownership & Timestamps**: `uid`, `entryId`, `roundNumber`, and `createdAt` cannot change after creation; `createdAt == request.time` on create and `updatedAt == request.time` on update.
4. **PII Isolation**: Zero email, phone, or address fields are permitted in `/leaderboard/{userId}`, `/round_entries/{entryId}`, or `/users/{userId}`.
5. **Strict Key & Size Boundaries**: All writes validate `keys().hasAll(...)` and `keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` on update, and enforce bounded numeric ranges and string lengths.
6. **Anti-Tamper Progression Bounds**: `rating`, `xp`, `level`, `highestCampaignLevel` (1–10000), `roundsCompleted` (0–1000), `stagesCleared` (0–10), `totalClearTimeMs` (0–36000000), `playerRank` (max 48 chars), `coins`, and `placement` are bounded to valid game ranges and single-update increments cannot exceed realistic match bounds.

## 2. The "Dirty Dozen" Attack Payloads
1. **Unauthenticated Leaderboard Forge**: `{ uid: "userA", rating: 9999 }` without `request.auth`. -> `PERMISSION_DENIED`
2. **Cross-User Profile Hijack**: Authenticated as `userB`, writing to `/users/userA`. -> `PERMISSION_DENIED`
3. **UID Spoofing inside Payload**: Authenticated as `userB`, writing `/users/userB` with `{ uid: "userA" }`. -> `PERMISSION_DENIED`
4. **Shadow Field Injection**: Writing `/users/userB` with extra field `isAdmin: true`. -> `PERMISSION_DENIED`
5. **Unbounded Array Resource Exhaustion**: Writing `unlockedSkins` with 500 items or non-string element `[123]`. -> `PERMISSION_DENIED`
6. **Resource Poisoning via Long ID**: Creating `/users/userB/matches/` with a 500-char `matchId`. -> `PERMISSION_DENIED`
7. **Timestamp Spoofing**: Sending `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`. -> `PERMISSION_DENIED`
8. **Immutable Field Mutation**: Updating `/users/userB` to change `createdAt` or `uid`. -> `PERMISSION_DENIED`
9. **Rating / Coin Overflow Cheat**: Setting `rating: 9999999` or `coins: -500` on `/leaderboard/userB` or `/users/userB`. -> `PERMISSION_DENIED`
10. **PII Injection on Leaderboard**: Attempting to add `email: "victim@example.com"` to `/leaderboard/userB`. -> `PERMISSION_DENIED`
11. **Orphaned Match Record**: Creating `/users/userB/matches/m1` before `/users/userB` exists. -> `PERMISSION_DENIED`
12. **User Profile Enumeration**: Running `list` query on `/users`. -> `PERMISSION_DENIED`
