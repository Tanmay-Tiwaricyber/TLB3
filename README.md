# TLB3 Pulse

A responsive workforce ERP with employee and administrator portals. The interface follows the FenxTek design system: warm paper, ink panels, violet controls, lime signal graphics, Inter Tight, Instrument Serif and JetBrains Mono. Fonts and Firebase web SDKs are served locally.

## Preview

Run `node scripts/serve.mjs` and open `http://localhost:3000`. The sign-in page works without provisioning accounts; there is **no demo password or client-side admin bypass**. Browser GPS needs HTTPS (or localhost) and location permission.

## Connect the live workspace

The web client targets Firebase project **chat-world-62138**. Its supplied public web configuration is already included. Configuring the web client does not deploy backend resources.

1. Enable Email/Password in Firebase Authentication and create the configured Realtime Database. Add the app host to Firebase Authentication’s authorized domains.
2. Install the Firebase CLI, authenticate with `firebase login`, then run `npm --prefix functions install` and `npm --prefix scripts install`. Scheduled Functions require billing, Cloud Scheduler and the relevant Google Cloud permissions.
3. Deploy trusted operations and deny-by-default RTDB rules:

   ```sh
   firebase deploy --project chat-world-62138 --only database,functions
   ```

4. Provision the first admin from a trusted terminal. Keep the service-account JSON outside this repository and hosting directory. The command creates (or updates) the dedicated `admin@example.com` Firebase Auth identity, admin claim and RTDB profile. Reserve that email for this account.

   ```sh
   export GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json
   read -rs -p 'Choose an admin password (12+ characters): ' ADMIN_PASSWORD; echo
   export ADMIN_PASSWORD
   node scripts/bootstrap-admin.mjs
   unset ADMIN_PASSWORD
   ```

5. Host the web client on HTTPS (e.g. `firebase deploy --project chat-world-62138 --only hosting`). Static Vercel route rewrites are also included. Deploying just the frontend does **not** deploy the scheduled absence job or callable functions.
6. Select **Admin**, sign in with user ID `admin`, then save the actual office name, latitude, longitude and allowed radius in **Settings**. Create employee IDs and temporary passwords in **Team**. Share credentials privately. Workers can change their passwords in Profile.

## Daily use

- **Employee:** Use the Employee tab, ID and password. Choose **Verify location & check in** in Overview. The callable function verifies the active account and distance from the configured office before recording Present. Missing GPS permission, poor accuracy, missing office configuration and out-of-radius positions block check-in. Browser-reported GPS is not tamper-proof.
- **Automatic absence:** At 00:05 Asia/Kolkata the scheduler closes the preceding date. Missing records for eligible active workers are marked Absent without replacing existing check-ins or admin corrections. Days without a finalized record are not presented as confirmed absences.
- **Payroll:** Admins record salary credits with an employee, amount, status and credit date. Employees can read their own salary history. This is a payment ledger, not a bank transfer service.
- **Administrator:** Create and edit worker profiles, reset passwords, disable/enable accounts, review and correct dated attendance, export a register, manage office policy and record salary credits.

## Data and access

Profiles (`/users/{uid}`), daily attendance (`/attendance/{employeeId}/{date}`), credits (`/payments/{employeeId}/{paymentId}`) and office policy (`/settings/office`) live in Realtime Database. Passwords stay in Firebase Authentication. The portal switch is presentation only: trusted writes require callable authorization or RTDB rules. Admin operations require a provisioned admin claim **and** the reserved admin email.

Run `node --test scripts/attendance.test.cjs` to check the attendance handlers against an in-memory database stub. Production verification requires deployed rules, Functions and authorized employee/admin accounts.
