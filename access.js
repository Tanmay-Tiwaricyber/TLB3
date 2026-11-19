let accessRole = 'Employee';
const pulseMark = `<svg aria-hidden="true" viewBox="0 0 36 36" fill="none"><path d="M2 20h7l4-10 5 18 5-23 4 15h7" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
const brand = () => `<span class="pulse-brand"><i>${pulseMark}</i>TLB3 <em>Pulse</em></span>`;
// Decorative UI icons: the surrounding control supplies its accessible name.
function icon(name,size=16){
  if (!/^[a-zA-Z]+$/.test(name) || !Number.isFinite(size)) return '';
  return `<svg class="lucide-icon" aria-hidden="true" focusable="false" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="/assets/lucide.svg#${name}"></use></svg>`;
}
function showPassword(btn){const input=$('#loginPass'),show=input.type==='password';input.type=show?'text':'password';btn.innerHTML=icon(show?'eyeOff':'eye',18);btn.setAttribute('aria-label',show?'Hide password':'Show password');btn.setAttribute('aria-pressed',String(show))}
function accessHelp(){modal(`<div class="meta violet">WORKSPACE SUPPORT</div><h2>Need help signing in?</h2><p>Use the email or ID and password issued by your workspace administrator. For email-based accounts, enter your sign-in email below to request a reset link. ID-only accounts need help from the project owner.</p><p>For administrator access, use the account provisioned by your workspace owner.</p><div class="field"><label for="resetEmail">Sign-in email</label><input type="email" id="resetEmail" autocomplete="email"></div><div class="modal-actions"><button class="btn btn-soft" onclick="sendResetEmail(document.getElementById('resetEmail').value.trim())">Send reset email</button><button class="btn btn-primary" onclick="closeModal()">Close</button></div>`)}
function chooseRole(role){if(role===accessRole)return;accessRole=role;render();document.querySelector('.role-switch button[aria-pressed=true]')?.focus({preventScroll:true})}
const modulesInfo=[
  ['location','Attendance','Location-verified check-ins.','Employees can mark themselves present within the office radius and review their daily attendance register.'],
  ['payroll','Payroll','Salary credits and payment history.','View your monthly salary, dated credits and payment status. Administrators record payments in the payroll ledger.'],
  ['team','People','Team accounts and access control.','Administrators create and manage employee accounts, update employment details and reset passwords.']
];
function moduleInfo(i){const [ic,title,,description]=modulesInfo[i];modal(`<div class="dialog-icon">${icon(ic,22)}</div><div class="meta violet">WORKSPACE MODULE / 0${i+1}</div><h2>${title}</h2><p>${description}</p><div class="modal-actions"><button class="btn btn-primary" onclick="closeModal()">Back to portal</button></div>`)}
function accessScreen(){const admin=accessRole==='Admin';return `<div class="access" data-section="portal">
<header class="access-header"><div class="limit topline"><div class="identity">${brand()}<span class="product-tag">Workforce OS</span></div><button class="help-button" type="button" onclick="accessHelp()">${icon('help',16)} Help center ${icon('arrowUpRight',13)}</button></div></header>
<main class="limit access-main" id="access-portal"><div class="access-grid">
<section class="cover" aria-labelledby="cover-heading"><img class="cover-photo" src="/assets/workspace-architecture.jpg" alt="" fetchpriority="high"><div class="cover-top"><span class="cover-tag meta"><i></i> WORKSPACE EDITION</span><span class="corner-plus" aria-hidden="true">${icon('plus',18)}</span></div>
<div class="cover-copy"><div class="cover-eyebrow meta">01 <span></span> THE WORKFORCE PORTAL</div><h1 id="cover-heading">Your work,<br><em>in focus.</em></h1><p>People, attendance and payroll.<br>One connected workspace.</p></div>
<div class="cover-foot meta"><span>${pulseMark} TLB3 SYSTEMS</span><span>FIG. 001 / OPERATIONS</span></div></section>
<section class="access-panel" aria-labelledby="sign-title"><div class="eyeline meta"><b></b> SECURE ACCESS</div><h2 id="sign-title">Welcome back<span>.</span></h2><p>Sign in to your ${admin?'admin':'employee'} workspace.</p>
<div class="role-switch" role="group" aria-label="Workspace type">${[['Employee','profile'],['Admin','shield']].map(([role,ic])=>`<button aria-pressed="${accessRole===role}" type="button" onclick="chooseRole('${role}')">${icon(ic,16)} ${role}</button>`).join('')}</div>
<form id="loginForm"><label for="loginId">Email or ${admin?'admin':'user'} ID</label><div class="entry">${icon('profile',17)}<input id="loginId" name="username" autocomplete="username" autocapitalize="none" placeholder="Enter your email or ID" required></div>
<div class="label-line"><label for="loginPass">Password</label><button type="button" onclick="accessHelp()">Forgot password?</button></div><div class="entry">${icon('lock',17)}<input id="loginPass" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required><button type="button" aria-label="Show password" aria-pressed="false" onclick="showPassword(this)">${icon('eye',18)}</button></div>
<div class="error" role="alert" id="loginError"></div><button class="sign-btn" type="submit">Sign in to workspace ${icon('arrowRight',18)}</button></form><div class="secure-note">${icon('shield',14)} Protected by role-based authentication</div></section></div>
<section id="access-modules" class="module-section" aria-labelledby="directory-title"><div class="section-title"><h2 id="directory-title">Workspace modules</h2><span class="meta">DIRECTORY / 03</span></div><div class="modules">${modulesInfo.map(([ic,title,desc],i)=>`<button class="module" type="button" onclick="moduleInfo(${i})"><span class="module-icon">${icon(ic,21)}</span><span class="module-text"><small class="meta">MODULE 0${i+1}</small><strong>${title}</strong><span>${desc}</span></span><span class="module-arrow">${icon('arrowUpRight',15)}</span></button>`).join('')}</div></section></main>
<footer class="limit access-footer"><span>© ${new Date().getFullYear()} TLB3 Pulse</span><span class="footer-system meta"><i></i> WORKFORCE OPERATING SYSTEM</span></footer><nav class="guest-dock" aria-label="Portal navigation"><button type="button" data-jump="portal" aria-current="location" onclick="portalJump('portal')">${icon('overview',18)}Portal</button><button type="button" data-jump="modules" onclick="portalJump('modules')">${icon('fileText',18)}Modules</button><button type="button" onclick="accessHelp()">${icon('help',18)}Help</button></nav></div>`}
function portalJump(section){
  const root=document.querySelector('.access');
  root.dataset.section=section;
  root.querySelectorAll('[data-jump]').forEach(button=>{if(button.dataset.jump===section)button.setAttribute('aria-current','location');else button.removeAttribute('aria-current')});
  window.scrollTo(0,0);
}
