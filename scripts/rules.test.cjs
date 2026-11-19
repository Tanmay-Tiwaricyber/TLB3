const test=require('node:test'),assert=require('node:assert/strict');
const {database}=require('targaryen'), rules=require('../database.rules.json');
const now=Date.parse('2026-11-19T18:35:00Z'),day=Math.floor((now+19800000)/86400000);
const user={role:'Employee',employeeId:'EMP1',name:'Worker',active:true};
const office={name:'Office',lat:26.45,lng:80.3,radius:100,lngScale:99557};
const base=database(rules,{users:{worker:user,admin:{...user,role:'Admin',employeeId:'ADMIN'},off:{...user,active:false,employeeId:'EMP2'}},settings:{office}},now);
const employee=base.as({uid:'worker'}),admin=base.as({uid:'admin'}),off=base.as({uid:'off'});
const check={status:'Present',day,timestamp:now,accuracy:4,latitude:26.45,longitude:80.3};
const path=`attendance/EMP1/${day}`, credit={employeeId:'EMP1',amount:500,date:'2026-11-19',recordedBy:'admin',status:'Credited'};
test('employee writes one in-radius check-in for the current India day',()=>{
 const res=employee.write(path,check,{now});assert.ok(res.allowed,res.info);
 assert.equal(res.newDatabase.as({uid:'worker'}).write(path,check,{now}).allowed,false);
 for(const [key,value] of [[path,{...check,longitude:81}],[path,{...check,day:day-1}],[path,{...check,status:'Absent'}],[path,{...check,accuracy:1001}],[path,{...check,checkIn:'forged'}],[`attendance/EMP1/${day-1}`,{...check,day:day-1}],[`attendance/EMP2/${day}`,check]])assert.equal(employee.write(key,value,{now}).allowed,false);
 assert.equal(off.write(`attendance/EMP2/${day}`,check,{now}).allowed,false);
});
test('workspace access cannot be self-provisioned or elevated',()=>{
 for(const who of [base.as(null),base.as({uid:'new'}),employee])assert.equal(who.write('users/new',{...user,role:'Admin'}).allowed,false);
 assert.ok(employee.update('users/worker',{name:'New name',email:'contact@example.org'}).allowed);
 for(const patch of [{role:'Admin'},{employeeId:'EMP2'},{monthlySalary:999},{active:true},{loginEmail:'other@example.org'}])assert.equal(employee.update('users/worker',patch).allowed,false);
 assert.equal(employee.read('users/admin').allowed,false);assert.equal(employee.read('users').allowed,false);
 const created=admin.update('/',{'users/new':{...user,employeeId:'EMP3'},'employeeIds/EMP3':'new'});assert.ok(created.allowed,created.info);
 assert.equal(created.newDatabase.as({uid:'admin'}).write('employeeIds/EMP3','duplicate').allowed,false);
});
test('salary credits and corrections are admin-only; employee reads are scoped',()=>{
 assert.ok(admin.write('payments/EMP1/payment1',credit).allowed);assert.ok(admin.write(path,{status:'Leave',updatedBy:'admin'}).allowed);
 assert.equal(employee.write('payments/EMP1/payment1',credit).allowed,false);assert.equal(employee.read('payments/EMP1').allowed,true);assert.equal(employee.read('payments/EMP2').allowed,false);assert.equal(off.read('payments/EMP2').allowed,false);assert.equal(off.read('users/off').allowed,false);assert.equal(off.read('users/off/active').allowed,true);
 assert.equal(employee.write('settings/office/radius',5000).allowed,false);
});
