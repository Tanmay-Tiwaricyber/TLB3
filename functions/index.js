const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');

admin.initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });
const db = admin.database();
const auth = admin.auth();
const APP_DOMAIN = 'tlb3pulse.com';
const ADMIN_EMAIL = 'admin@example.com';

const fail = (code, message) => { throw new HttpsError(code, message); };
const cleanId = value => String(value || '').trim().toUpperCase();
const validId = value => /^[A-Z0-9_-]{3,24}$/.test(value);
const authEmail = id => `${id.toLowerCase()}@${APP_DOMAIN}`;
const requiredString = (value, label, max = 120) => {
  const v = String(value || '').trim();
  if (!v || v.length > max) fail('invalid-argument', `${label} is required (max ${max} characters).`);
  return v;
};
function requireAuth(request) {
  if (!request.auth) fail('unauthenticated', 'Sign in to continue.');
  return request.auth;
}
function requireAdmin(request) {
  const user = requireAuth(request);
  if (user.token.admin !== true || user.token.email !== ADMIN_EMAIL) fail('permission-denied', 'Administrator access is required.');
  return user;
}
async function findEmployee(employeeId) {
  const id = cleanId(employeeId);
  if (!validId(id)) fail('invalid-argument', 'Employee ID is invalid.');
  const snap = await db.ref('users').orderByChild('employeeId').equalTo(id).once('value');
  let found = null;
  snap.forEach(child => { found = { uid: child.key, profile: child.val() }; });
  if (!found) fail('not-found', 'Employee account was not found.');
  return found;
}
function dayInIndia(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function timeInIndia(date = new Date()) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(date);
}
function distanceMeters(lat1, lon1, lat2, lon2) {
  const rad = d => d * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

exports.createEmployee = onCall(async request => {
  requireAdmin(request);
  const d = request.data || {};
  const employeeId = cleanId(d.employeeId);
  if (!validId(employeeId)) fail('invalid-argument', 'Use a 3–24 character employee ID (letters, numbers, dash or underscore).');
  const name = requiredString(d.name, 'Name');
  const department = requiredString(d.department, 'Department');
  const jobTitle = requiredString(d.jobTitle || 'Team member', 'Job title');
  const monthlySalary = Number(d.monthlySalary);
  const password = String(d.tempPassword || '');
  if (!Number.isFinite(monthlySalary) || monthlySalary < 0) fail('invalid-argument', 'Monthly salary must be a valid non-negative amount.');
  if (password.length < 8 || password.length > 128) fail('invalid-argument', 'Temporary password must be at least 8 characters.');
  let created;
  try {
    created = await auth.createUser({ email: authEmail(employeeId), password, displayName: name, disabled: false });
    await db.ref(`users/${created.uid}`).set({
      employeeId, name, department, jobTitle, monthlySalary,
      role: 'Employee', active: true, joinDate: String(d.joinDate || dayInIndia()),
      email: '', phone: '', city: '', emergency: '', createdAt: Date.now(), updatedAt: Date.now()
    });
    return { uid: created.uid, employeeId };
  } catch (e) {
    if (created) await auth.deleteUser(created.uid).catch(() => {});
    if (e instanceof HttpsError) throw e;
    if (e.code === 'auth/email-already-exists') fail('already-exists', 'That employee ID already has an account.');
    console.error('createEmployee failed', e);
    fail('internal', 'Could not create the employee account.');
  }
});

exports.updateEmployee = onCall(async request => {
  const adminUser = requireAdmin(request);
  const d = request.data || {};
  const { uid } = await findEmployee(d.employeeId);
  const updates = { updatedAt: Date.now(), updatedBy: adminUser.uid };
  if (d.name !== undefined) updates.name = requiredString(d.name, 'Name');
  if (d.department !== undefined) updates.department = requiredString(d.department, 'Department');
  if (d.jobTitle !== undefined) updates.jobTitle = requiredString(d.jobTitle, 'Job title');
  if (d.monthlySalary !== undefined) {
    const amount = Number(d.monthlySalary);
    if (!Number.isFinite(amount) || amount < 0) fail('invalid-argument', 'Monthly salary is invalid.');
    updates.monthlySalary = amount;
  }
  await db.ref(`users/${uid}`).update(updates);
  return { ok: true };
});

exports.setEmployeePassword = onCall(async request => {
  requireAdmin(request);
  const password = String(request.data?.password || '');
  if (password.length < 8 || password.length > 128) fail('invalid-argument', 'Password must be at least 8 characters.');
  const { uid } = await findEmployee(request.data?.employeeId);
  await auth.updateUser(uid, { password });
  await db.ref(`users/${uid}/updatedAt`).set(Date.now());
  return { ok: true };
});

exports.setEmployeeActive = onCall(async request => {
  requireAdmin(request);
  const { uid } = await findEmployee(request.data?.employeeId);
  const active = request.data?.active === true;
  await auth.updateUser(uid, { disabled: !active });
  await db.ref(`users/${uid}`).update({ active, updatedAt: Date.now() });
  return { ok: true, active };
});

exports.updateMyProfile = onCall(async request => {
  const user = requireAuth(request);
  const d = request.data || {};
  const updates = { updatedAt: Date.now() };
  for (const key of ['name', 'email', 'phone', 'city', 'emergency']) {
    if (d[key] !== undefined) {
      const value = String(d[key] || '').trim();
      if (value.length > 160) fail('invalid-argument', `${key} is too long.`);
      updates[key] = value;
    }
  }
  if (!updates.name && d.name !== undefined) fail('invalid-argument', 'Name cannot be empty.');
  await db.ref(`users/${user.uid}`).update(updates);
  return { ok: true };
});

exports.markAttendance = onCall(async request => {
  const user = requireAuth(request);
  const profileSnap = await db.ref(`users/${user.uid}`).once('value');
  const profile = profileSnap.val();
  if (!profile || profile.role !== 'Employee' || profile.active !== true) fail('permission-denied', 'Active employee access is required.');
  const lat = Number(request.data?.latitude), lng = Number(request.data?.longitude), accuracy = Number(request.data?.accuracy || 0);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) fail('invalid-argument', 'A valid device location is required.');
  if (accuracy > 1000) fail('failed-precondition', 'Location accuracy is too low. Try again outdoors.');
  const officeSnap = await db.ref('settings/office').once('value');
  const office = officeSnap.val();
  if (!office || !Number.isFinite(Number(office.lat)) || !Number.isFinite(Number(office.lng)) || !Number(office.radius)) fail('failed-precondition', 'Office location has not been configured by your administrator.');
  const distance = Math.round(distanceMeters(lat, lng, Number(office.lat), Number(office.lng)));
  if (distance > Number(office.radius)) fail('permission-denied', `Check-in blocked: device is ${distance}m outside the office geofence.`);
  const date = dayInIndia(), ref = db.ref(`attendance/${profile.employeeId}/${date}`), now = Date.now();
  const result = await ref.transaction(current => current || {
    employeeId: profile.employeeId, date, status: 'Present', checkIn: timeInIndia(new Date(now)),
    office: office.name, distanceMeters: distance, locationAccuracyMeters: Math.round(accuracy), timestamp: now, source: 'device-gps'
  }, undefined, false);
  if (!result.committed) fail('already-exists', 'Attendance has already been recorded for today.');
  return { ok: true, date, distanceMeters: distance };
});

exports.adjustAttendance = onCall(async request => {
  const adminUser = requireAdmin(request);
  const d = request.data || {}, employeeId = cleanId(d.employeeId), date = String(d.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail('invalid-argument', 'Attendance date is invalid.');
  const { profile } = await findEmployee(employeeId);
  const ref = db.ref(`attendance/${employeeId}/${date}`);
  if (d.status === 'Pending') { await ref.remove(); return { ok: true }; }
  if (!['Present', 'Absent', 'Leave'].includes(d.status)) fail('invalid-argument', 'Attendance status is invalid.');
  await ref.set({ employeeId, date, status: d.status, checkIn: String(d.checkIn || ''), office: String(d.location || ''), updatedAt: Date.now(), updatedBy: adminUser.uid, employeeName: profile.name, source: 'admin-adjustment' });
  return { ok: true };
});

exports.recordSalaryCredit = onCall(async request => {
  requireAdmin(request);
  const d = request.data || {}, employeeId = cleanId(d.employeeId), amount = Number(d.amount), creditDate = String(d.creditDate || '');
  const { profile } = await findEmployee(employeeId);
  if (!Number.isFinite(amount) || amount <= 0) fail('invalid-argument', 'Payment amount must be greater than zero.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(creditDate)) fail('invalid-argument', 'Credit date is invalid.');
  const status = ['Credited', 'Processing'].includes(d.status) ? d.status : 'Credited';
  const paymentRef = db.ref(`payments/${employeeId}`).push();
  await paymentRef.set({ paymentId: paymentRef.key, employeeId, employeeName: profile.name, date: creditDate, amount, recordedBy: request.auth.uid, method: String(d.method || 'Bank transfer'), status, recordedAt: Date.now() });
  return { paymentId: paymentRef.key };
});

exports.updateOfficeSettings = onCall(async request => {
  requireAdmin(request);
  const d = request.data || {}, name = requiredString(d.name, 'Office name');
  const lat = Number(d.lat), lng = Number(d.lng), radius = Number(d.radius);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180 || !Number.isFinite(radius) || radius < 10 || radius > 5000) fail('invalid-argument', 'Office coordinates or radius are invalid.');
  await db.ref('settings/office').set({ name, lat, lng, radius, updatedAt: Date.now(), updatedBy: request.auth.uid });
  return { ok: true };
});

exports.closeAttendanceDay = onSchedule({ schedule: '59 23 * * *', timeZone: 'Asia/Kolkata' }, async () => {
  const date = dayInIndia();
  const users = await db.ref('users').once('value');
  const tasks = [];
  users.forEach(child => {
    const p = child.val();
    if (p && p.role === 'Employee' && p.active === true) {
      const ref = db.ref(`attendance/${p.employeeId}/${date}`);
      tasks.push(ref.transaction(existing => existing || {
        employeeId: p.employeeId, date, status: 'Absent', checkIn: '', office: '', timestamp: Date.now(), source: 'automatic-close'
      }, undefined, false));
    }
  });
  await Promise.all(tasks);
});
