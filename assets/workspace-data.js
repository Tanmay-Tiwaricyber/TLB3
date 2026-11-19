// All network mutations use Firebase Auth or Realtime Database. RTDB rules, not
// these UI checks, authorize writes. Employee credentials never go into RTDB.
const IST_OFFSET = 19800000, DAY_MS = 86400000;
const dayIndex = date => Date.parse(`${date}T00:00:00Z`) / DAY_MS;
const serverTime = () => firebase.database.ServerValue.TIMESTAMP;
const workspace = {
  async createEmployee({employeeId, name, department, jobTitle, monthlySalary, loginEmail, tempPassword, joinDate}) {
    if (employeeId === 'ADMIN' || userBy(employeeId)) throw Error('This employee ID is already in use.');
    const email = loginEmail || authEmailFor(employeeId);
    const secondary = firebase.initializeApp(firebaseConfig, 'provision-'+Date.now());
    let account;
    try {
      const signup = secondary.auth();
      await signup.setPersistence(firebase.auth.Auth.Persistence.NONE);
      account = (await signup.createUserWithEmailAndPassword(email, tempPassword)).user;
      await db.ref().update({
        [`employeeIds/${employeeId}`]: account.uid,
        [`users/${account.uid}`]: {employeeId, name, department, jobTitle, monthlySalary, loginEmail:email,
          active:true, role:'Employee', joinDate, createdAt:serverTime(), updatedAt:serverTime()}
      });
    } catch (error) {
      if (account) {
        try { await account.delete(); } catch { throw Error('Profile setup failed. Check the Auth account and RTDB profile in Firebase Console before retrying.'); }
      }
      throw error;
    } finally { await secondary.delete(); }
  },
  updateEmployee({employeeId,...fields}) {return db.ref('users/'+userBy(employeeId).uid).update({...fields,updatedAt:serverTime()});},
  setEmployeeActive({employeeId,active}) {return this.updateEmployee({employeeId,active});},
  updateMyProfile(fields) {return db.ref('users/'+auth.currentUser.uid).update(fields);},
  async markAttendance({latitude,longitude,accuracy}) {
    const o=data.office;
    if (!o.lngScale) throw Error('Ask your administrator to save the office location before checking in.');
    if (![latitude,longitude,accuracy].every(Number.isFinite) || accuracy<0 || accuracy>1000) throw Error('Unable to get an accurate GPS fix. Try again outdoors.');
    if (Math.hypot((latitude-o.lat)*111195,(longitude-o.lng)*o.lngScale)>o.radius) throw Error('You are outside the office check-in radius.');
    const offset=(await db.ref('.info/serverTimeOffset').once('value')).val() || 0;
    const day=Math.floor((Date.now()+offset+IST_OFFSET)/DAY_MS);
    const date=new Date(day*DAY_MS).toISOString().slice(0,10);
    if (dayRecord(current.id,date)) throw Error('Attendance already exists for today.');
    // The database independently checks server time, office radius, identity
    // and create-only semantics. A second/concurrent submission cannot overwrite.
    await db.ref(`attendance/${current.id}/${day}`).set({day,status:'Present',latitude,longitude,accuracy,timestamp:serverTime()});
  },
  adjustAttendance({employeeId,date,status,checkIn,location}) {
    const day=dayIndex(date);
    if (!Number.isInteger(day)) throw Error('Select a valid register date.');
    // Remove any legacy ISO-keyed record atomically with the new entry.
    return db.ref(`attendance/${employeeId}`).update({[date]:null,[day]:status==='Pending'?null:{status,checkIn,office:location,updatedBy:auth.currentUser.uid,updatedAt:serverTime()}});
  },
  recordSalaryCredit({employeeId,amount,creditDate,status,method}) {
    if (!Number.isFinite(amount)||amount<=0) throw Error('Enter a positive credit amount.');
    return db.ref('payments/'+employeeId).push({employeeId,amount,date:creditDate,status,method,recordedBy:auth.currentUser.uid,recordedAt:serverTime()});
  }
};
function registerEntries(records,employeeId,out) {
  // Older deployments used ISO dates. An existing legacy correction wins if
  // both key formats exist, until the admin next edits the day.
  for(const [key,raw] of Object.entries(records||{})) {
    const numeric=/^\d{1,6}$/.test(key), date=numeric?new Date(Number(key)*DAY_MS).toISOString().slice(0,10):key;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
    const id=employeeId+'_'+date;
    if(numeric && out[id])continue;
    const record=attendanceRecord(raw);
    if(numeric && record.timestamp && !record.updatedBy){
      record.checkIn=new Date(record.timestamp).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hour12:true});
      record.location='Office check-in';
    }
    out[id]=record;
  }
}
async function sendResetEmail(email){
  if(!email || !email.includes('@') || email.endsWith('@tlb3pulse.com')){toast('Use a reachable sign-in email. For ID-only accounts, contact the Firebase project owner.');return;}
  try {await auth.sendPasswordResetEmail(email);toast('If the account exists, check the sign-in inbox for a reset link.');} catch(error){toast(error.message || 'Could not send the reset email.');}
}
