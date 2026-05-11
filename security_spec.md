# Security Spec

## Data Invariants
1. User profiles are restricted to the owner only.
2. Chat access is restricted to participants only.

## The Payloads (Verified)
- Create User: `{uid: "myuid", displayName: "Me", email: "me@example.com", uniqueToken: "ABC12345"}`
- Update User (Non-owner): `{uid: "otheruid", displayName: "Hacker"}`
- Create Chat (Valid): `{participants: ["uid1", "uid2"]}`
- Read Chat (Non-participant): Unauthorized
