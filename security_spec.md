# Security Specification for README Stylerate

## 1. Data Invariants
- A user can only access, create, or delete their own UserProfile document.
- Readme history records are stored under subcollections of `/users/{userId}/readmes/{readmeId}` and must only be visible to the parent user.
- Readme history records are immutable after creation.
- Document IDs must match the `isValidId` string format.

## 2. The "Dirty Dozen" Payloads
These payloads describe attempts to bypass the security rules.

### User Profile Payloads
1. **Identity Spoofing on Create**: Attempting to create a user profile for `user_A` while logged in as `user_B`.
2. **Missing Required Fields**: Creating a profile without the `plan` field.
3. **Privilege Escalation via Plan**: Trying to create or change profile with plan = `"enterprise-admin"`.
4. **Altering Immutable Fields**: Updating `createdAt` timestamp of a profile.
5. **Junk Characters ID**: Creating a profile with a 150-character weird ID.

### Readme History Payloads
6. **Cross-Tenant View**: User B trying to fetch User A's readme list.
7. **Cross-Tenant Write**: User B writing to `/users/user_A/readmes/some_id`.
8. **Invalid Readme ID format**: Creating a entry under `/users/user_A/readmes/@@bad-id!!`.
9. **Payload Size Flood**: Creating a readme record with an infinite string size description field.
10. **Mutating Immutable Readme**: Updating a generated readme content.
11. **Malicious Score Modification**: Injecting a custom negative quality score into the readme.
12. **Missing Parent Owner**: Creating a readme history in a directory that is not owned by the user.

## 3. Test Runner
Below is a verification representation of rules:
- Any unauthorized operations yield `permission-denied` in standard mock environment tests.
