import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

const projectId = 'chat-world-62138';
const databaseURL = 'https://chat-world-62138-default-rtdb.firebaseio.com';
const employeeId = String(process.env.ADMIN_USER_ID || 'admin').trim().toUpperCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || 'Workspace Administrator';
if (!password || password.length < 12) throw new Error('Set ADMIN_PASSWORD to a strong value of at least 12 characters.');
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to a Firebase service-account JSON file. Do not commit that file.');

initializeApp({ credential: applicationDefault(), projectId, databaseURL });
const auth = getAuth();
const db = getDatabase();
const email = String(process.env.ADMIN_EMAIL || `${employeeId.toLowerCase()}@tlb3pulse.com`).trim().toLowerCase();
let user;
try {
  user = await auth.getUserByEmail(email);
  user = await auth.updateUser(user.uid, { password, displayName: name, disabled: false });
} catch (error) {
  if (error.code !== 'auth/user-not-found') throw error;
  user = await auth.createUser({ email, password, displayName: name, disabled: false });
}
await auth.setCustomUserClaims(user.uid, { admin: true });
await db.ref(`users/${user.uid}`).update({
  employeeId, name, role: 'Admin', active: true,
  department: 'Administration', jobTitle: 'Workspace Administrator',
  monthlySalary: 0, joinDate: new Date().toISOString().slice(0, 10),
  email: '', phone: '', city: '', emergency: '', updatedAt: Date.now()
});
console.log(`Admin provisioned: user ID ${employeeId}. Password is not printed.`);
