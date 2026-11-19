# TLB3 Pulse

Employee attendance, payroll and account management using **Firebase Authentication (Email/Password) and Firebase Realtime Database**. The frontend is static. No Cloud Functions deployment, Cloud Scheduler, service-account key, custom claims, or application API server is required.

## Connect the app

1. In project `chat-world-62138`, enable **Authentication → Sign-in method → Email/Password**, add your frontend host to the Auth authorized domains, and enable Realtime Database at the URL configured in `index.html`.
2. Publish **`database.rules.json`** in **Realtime Database → Rules**, or run `firebase deploy --project chat-world-62138 --only database` from an authenticated terminal. Back up existing data/rules first. If the Firebase project also hosts unrelated apps, merge the workspace rules carefully instead of replacing their rules. An existing permissive parent rule overrides more restrictive child rules.
3. Create your administrator in **Authentication → Users** with a real email and strong password. Copy its **UID**. Using the trusted Firebase Console, add the following profile at **`users/<that exact UID>`**, not under the email or employee ID:

   ```json
   { "employeeId": "ADMIN", "name": "Workspace Admin", "role": "Admin", "active": true }
   ```

   If you already have an admin Auth account and active Admin profile from an earlier release, reuse them. Only a trusted project owner or an existing active admin may grant workspace roles. Never allow public writes to `users`.
4. Publish the static client to your web host. Select **Admin** and sign in with the actual Auth email and password. The short `admin` alias is only for legacy `admin@example.com` accounts.
5. In **Settings**, save the office coordinates and radius **once, even for an existing office**: this adds the longitude scale required by the new geofence rule. Use HTTPS for GPS access (or localhost).

## Accounts and recovery

- In **Team → Add employee**, enter a unique short employee ID, employment details and an initial password. Enter a reachable **sign-in email** for email login and Firebase password-reset links. The employee ID identifies attendance and payroll; if a real sign-in email is supplied, use that email at login.
- Leaving the sign-in email blank uses the existing ID-only convention (`EMP005` → `emp005@tlb3pulse.com`). Use this only if your organization controls that domain. An alias with no inbox cannot receive reset emails. Prefer real sign-in emails for new workers.
- Provisioning uses a temporary Auth instance with in-memory persistence so it does not sign out the administrator. A single admin-authorized RTDB update saves the profile and reserves the ID. Passwords are never written to RTDB. Even if someone registers directly with Firebase Auth, they cannot create their own workspace profile or access protected records.
- **Forgot password** sends a Firebase reset link to the account’s sign-in inbox. A worker can also change their password while signed in. An admin cannot retrieve passwords or set another user’s password from the browser. ID-only account recovery requires a trusted project owner (for example, updating the Auth account to a reachable email, then requesting a reset). Changing a *contact* email in Profile does not change the Auth login.
- **Disable account** revokes workspace access using `users/<uid>/active`; it does not disable the Firebase Auth identity across other applications. Project owners can separately disable that identity in Firebase Console.

## Attendance and payroll

A worker may create one Present check-in per India calendar day. RTDB rules verify active membership, employee ID, create-only access, the current day against Firebase server time, GPS accuracy and distance against the admin-set office radius. The check stores the submitted position and accuracy. Only the employee and admins should have access; set a retention policy appropriate to your workplace. Browser-supplied GPS is not proof against location spoofing.

There is **no background absence job**. In calendars, summaries and CSV exports, a completed India day with no entry is shown as Absent for currently active employees on or after their join date. Today remains Pending until check-in; explicit records and admin corrections take precedence. Missing days for inactive workers or before joining are not inferred. This is a display policy, not a historical ledger of active/disabled intervals.

Admins record salary amounts, credit dates and status. Workers can read only their own payments. Recording a credit does not transfer funds.

### Existing data

Profiles (`users/<uid>`), office settings, payments (`payments/<employeeId>`) and ISO-date-keyed attendance remain readable. New attendance uses `attendance/<employeeId>/<India day number>` so rules can compare the key with server time. The UI displays ordinary dates and merges both formats; editing a legacy day migrates it atomically. Existing Auth accounts are not recreated. If an older Functions-based backend **was previously deployed**, retire its callable endpoints and scheduled absence job separately in the cloud console: updating this repository does not undeploy remote resources.

## Local preview and checks

```sh
node scripts/serve.mjs              # http://localhost:3000
npm ci --prefix scripts             # test dependencies only
npm test --prefix scripts
```

Tests exercise the database rules with an offline interpreter and the provisioning flow with SDK stubs. They do not modify live Firebase accounts or data. After publishing the rules and client, verify sign-in, employee creation, one in-range check-in, a rejected out-of-range check-in, and a dated salary credit using dedicated test accounts.

### Interface icons

The portal and dashboards use [Lucide](https://lucide.dev/) via a small local SVG sprite (`assets/lucide.svg`). The Pulse wordmark and launch artwork remain custom. To change the icon set, edit the mapping in `scripts/build-icons.mjs`, then run `npm ci --prefix scripts` and `npm run icons --prefix scripts`. Commit the regenerated sprite and license alongside the change. Static hosting requires no build step or external icon service.
