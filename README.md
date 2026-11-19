# TLB3 Pulse

Firebase-backed workforce management application: employee and admin sign-in, attendance, office geofencing, payroll history, employee management, reports, and workspace settings. Firebase web configuration is public client configuration; access control is enforced by Realtime Database rules and callable Cloud Functions, not by hiding the API key.

## Firebase project

The app is configured for project `chat-world-62138` and writes application data to Realtime Database. It does not store account passwords in the database: Firebase Authentication handles passwords.

### One-time setup

1. In Firebase Console, enable **Authentication → Email/Password**, add your deployed app's host under **Authentication → Settings → Authorized domains**, and create/enable **Realtime Database** in the configured project.
2. From this project directory, install the Firebase CLI and sign in:

   ```sh
   npm install -g firebase-tools
   firebase login
   firebase use chat-world-62138
   npm --prefix functions install
   npm --prefix scripts install
   ```

3. Create a service-account key in Firebase/GCP IAM for the one-time admin bootstrap. Keep it outside this repository. Bootstrap an admin (the default ID is `admin`; choose a strong password yourself):

   ```sh
   export GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json
   export ADMIN_PASSWORD='use-a-unique-strong-password'
   # Optional: export ADMIN_USER_ID=admin ADMIN_NAME='Workspace Administrator'
   # Optional: export ADMIN_EMAIL=admin@example.com to use that sign-in email
   node scripts/bootstrap-admin.mjs
   ```

   Sign-in accepts the user ID or Firebase Auth email and password. Employee IDs map internally to `{id}@tlb3pulse.com`; admins can set `ADMIN_EMAIL` (for example, `admin@example.com`) during bootstrap. Admin-panel access requires the server-provisioned admin claim and the configured admin email `admin@example.com`; email text alone does not grant access. Realtime Database rules and callable Functions both enforce this email/claim pair. The bootstrap script never prints the password.

4. Deploy the database rules, callable functions, and web app:

   ```sh
   firebase deploy --only database,functions,hosting
   ```

   Cloud Functions (including the scheduled daily attendance close) may require the Firebase/Google Cloud **Blaze** billing plan and Cloud Scheduler to be enabled. Add billing alerts before production use.

5. Sign in as `admin` with the password you set. Open **Settings** and save the actual office name, latitude, longitude, and geofence radius before workers attempt check-in. Then create employee accounts from **People**. Share each employee ID and temporary password securely; have employees change their password after first sign-in.

## Data model (Realtime Database)

- `/users/{uid}` — employee/admin profile and role (no passwords)
- `/attendance/{employeeId}/{YYYY-MM-DD}` — check-in and final daily status
- `/payments/{employeeId}/{paymentId}` — salary credit records
- `/settings/office` — office coordinates and radius

Browser clients read only the authenticated user's own profile, attendance, and payment history; admins require both the custom `admin` auth claim and `admin@example.com`. Employee/account, attendance, and payroll writes use callable Cloud Functions. The office settings node permits only validated writes from that claimed admin account under RTDB rules. Attendance geofencing is validated server-side and unmarked active-worker days are finalized as absent at 23:59 Asia/Kolkata. A browser GPS location is not cryptographic proof; review fraud, privacy, labor-law, and payroll requirements before production use.

## Mobile app experience

The app has a native Android wrapper in `android-app/` (Capacitor, package `com.tlb3.pulse`) with local bundled UI, native geolocation, About update-check action, and a WorkManager GitHub-release notification check roughly every six hours. A debug APK is available as `TLB3-Pulse-Android.apk`; it is debug-signed for personal installation, not Play Store release. Build and release-signing notes are in `android-app/README-ANDROID.md`. The updater requires a public GitHub repository/release and an APK attached to the release; Android still requires user confirmation to install. The responsive web version remains installable as a PWA from HTTPS. Firebase login and data access in the Android APK still require the Firebase setup described above.

## Run the web client locally

Firebase web SDKs load from the official Google CDN. Serve the files over HTTPS (required for browser geolocation outside localhost), for example with Firebase Hosting or a trusted local HTTPS server. Configure Firebase Auth, database rules, functions, and an initial admin account before signing in.

## Files

- `index.html` — responsive employee/admin web UI and Firebase client
- `database.rules.json` — deny-by-default RTDB rules
- `functions/index.js` — authenticated callable operations and scheduled absence finalizer
- `scripts/bootstrap-admin.mjs` — one-time admin account bootstrap using service-account credentials
- `firebase.json`, `.firebaserc` — deployment configuration
