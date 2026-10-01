const { createClient } = window.supabase;
const SUPABASE_URL = window.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "";
const isLegacyServiceRoleKey = (() => {
  try {
    const part = SUPABASE_ANON_KEY.split(".")[1];
    if (!part) return false;
    const json = JSON.parse(atob(part.replace(/-/g,"+").replace(/_/g,"/") + "=="));
    return json.role === "service_role";
  } catch (_) { return false; }
})();
const isSecretStyleKey = /^sb_secret_/i.test(SUPABASE_ANON_KEY);
const configured = SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.startsWith("YOUR_") && !SUPABASE_ANON_KEY.startsWith("YOUR_") && !isLegacyServiceRoleKey && !isSecretStyleKey;
const db = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } }) : null;
const A=document.querySelector("#app");
let S={page:"home",p:null,admin:false,subjects:[],recordings:[],times:[],fees:[],students:[],grades:[],months:[],access:[],warnings:[]};
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const F=(l,n,t="text",r=false,v="")=>`<div class="field"><label>${l}</label><input name="${n}" type="${t}" value="${esc(v)}" ${r?"required":""}></div>`;
const P=()=>`<div class="field"><label>Password (6 digits)</label><div class="passwordWrap"><input id="passwordInput" name="password" type="password" inputmode="numeric" autocomplete="current-password" maxlength="6" minlength="6" pattern="[0-9]{6}" required><button id="passwordToggle" class="passwordToggle" type="button" aria-label="Show password">Show</button></div></div>`;
const usernameEmail=u=>`${u.toLowerCase()}@vidma.local`;
const SEL=(l,n,a,v="")=>`<div class="field"><label>${l}</label><select name="${n}" required>${a.map(x=>`<option value="${esc(x)}" ${String(x)==String(v)?"selected":""}>${esc(x)}</option>`).join("")}</select></div>`;
const grades=["5","6","7","8","9","10","11"],months=["January","February","March","April","May","June","July","August","September","October","November","December"];
const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const L=x=>document.querySelector("#"+x);
const avatarHtml=(url,name="Profile")=>url?`<img class="avatar" src="${esc(url)}" alt="${esc(name)}">`:`<span class="avatar avatarFallback">👤</span>`;

async function uploadAvatar(file){
  if(!file) return;
  if(!file.type.startsWith("image/")) throw new Error("Profile picture must be an image file.");
  if(file.size>5*1024*1024) throw new Error("Profile picture must be under 5MB.");
  const uid=S.p?.id;
  if(!uid) throw new Error("User session not found.");
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
  const path=`${uid}/avatar.${ext}`;
  const up=await db.storage.from("avatars").upload(path,file,{upsert:true,contentType:file.type,cacheControl:"3600"});
  if(up.error) throw new Error(`Profile picture upload failed: ${up.error.message}`);
  const pub=db.storage.from("avatars").getPublicUrl(path);
  const url=pub?.data?.publicUrl;
  if(!url) throw new Error("Could not get the profile picture URL.");
  const finalUrl=`${url}${url.includes("?")?"&":"?"}v=${Date.now()}`;
  const u=await db.from("profiles").update({avatar_url:finalUrl}).eq("id",uid);
  if(u.error) throw new Error(`Profile picture save failed: ${u.error.message}`);
  S.p.avatar_url=finalUrl;
}

async function removeAvatar(){
  const uid=S.p?.id;
  if(!uid) return;
  // Remove known avatar filename variants without relying on a directory listing.
  const paths=["jpg","jpeg","png","webp","gif","avif"].map(ext=>`${uid}/avatar.${ext}`);
  const rm=await db.storage.from("avatars").remove(paths);
  if(rm.error) console.warn("Avatar storage remove warning",rm.error);
  const u=await db.from("profiles").update({avatar_url:null}).eq("id",uid);
  if(u.error) throw new Error(`Profile picture remove failed: ${u.error.message}`);
  S.p.avatar_url=null;
}

function auth(message=""){
 A.innerHTML=`<div class="auth"><div class="box"><div class="brand"><img class="brand-logo" src="assets/logo.png" alt="VIDMA ONLINE TAKSALAWA"><div><h1>VIDMA ONLINE TAKSALAWA</h1><div>Modern classroom portal</div></div></div><div class="tabs"><button id="l" class="on" type="button">Login</button><button id="r" type="button">Register</button></div><form id="af"><div id="extra" style="display:none">${F("Full Name","full_name","text",true)}<div class="grid">${F("Date of Birth","dob","date",true)}${SEL("Grade","grade",grades,"5")}</div>${F("Address","address","text",true)}${F("School","school","text",true)}<div class="grid">${F("WhatsApp","whatsapp","tel")}${F("Phone","phone","tel")}</div><small>WhatsApp හෝ Phone් අංකයෙන් එකක් අනිවාර්යයි.</small><hr></div>${F("Username","username","text",true)}${P()}<button class="primary wide" id="go" type="submit">Login</button><p id="err"></p></form></div></div>`;
 let reg=false;
 const extra=L("extra"),go=L("go"),err=L("err"),form=L("af"),passwordInput=L("passwordInput"),passwordToggle=L("passwordToggle");
 passwordToggle.onclick=()=>{const showing=passwordInput.type==="text";passwordInput.type=showing?"password":"text";passwordToggle.textContent=showing?"Show":"Hide";passwordToggle.setAttribute("aria-label",showing?"Show password":"Hide password");};
 if(message) err.textContent=message;
 const setMode=(isReg)=>{
   reg=isReg;
   L("l").classList.toggle("on",!reg);
   L("r").classList.toggle("on",reg);
   extra.style.display=reg?"block":"none";
   go.textContent=reg?"Register":"Login";
   err.textContent="";
   // Registration-only fields must never be required while logging in.
   extra.querySelectorAll("input,select").forEach(el=>{
     if(el.name==="whatsapp" || el.name==="phone") el.required=false;
     else el.required=reg;
   });
 };
 L("l").onclick=()=>setMode(false);
 L("r").onclick=()=>setMode(true);
 setMode(false);
 form.onsubmit=async e=>{
   e.preventDefault();
   err.textContent="";
   if(!db){err.textContent=(isLegacyServiceRoleKey||isSecretStyleKey)?"Security error: Do not put a secret/service_role key in config.js. Use only the Supabase Publishable/anon key.":"Set the Supabase URL and Publishable Key in config.js.";return;}
   go.disabled=true;
   go.textContent=reg?"Registering…":"Logging in…";
   try{
     const d=Object.fromEntries(new FormData(form));
     const username=(d.username||"").trim().toLowerCase();
     const password=(d.password||"").trim();
     if(!/^[a-z0-9_]{3,30}$/.test(username)) throw new Error("Username may contain only English letters, numbers and _. Minimum 3 characters.");
     if(!/^[0-9]{6}$/.test(password)) throw new Error("Password must be exactly 6 digits.");
     const email=usernameEmail(username);
     if(reg){
       if(!d.whatsapp&&!d.phone) throw new Error("WhatsApp හෝ Phone් අංකයෙන් එකක් අවශ්‍යයි.");
       const {data,error}=await db.auth.signUp({
         email,
         password,
         options:{data:{username,full_name:d.full_name,dob:d.dob,grade:d.grade,address:d.address,school:d.school,whatsapp:d.whatsapp||"",phone:d.phone||""}}
       });
       if(error) throw error;
       if(data.session){
         bootDone = false;
         await boot();
       }else{
         err.textContent="Registration successful. Login with your Username and 6-digit Password. Supabase Email Confirmation must be OFF.";
         go.disabled=false; go.textContent="Register";
       }
     }else{
       // The user enters only Username + 6-digit password. The app maps the username to its internal Supabase auth email.
       const {data,error}=await db.auth.signInWithPassword({email,password});
       if(error) throw error;
       if(!data?.session) throw new Error("Login session was not created. Check Supabase Auth settings and email confirmation status.");
       bootDone = false;
       await boot();
     }
   }catch(x){
     console.error("Auth error",x);
     err.textContent=x.message||String(x);
     go.disabled=false;
     go.textContent=reg?"Register":"Login";
   }
 };
}

async function loadData(){
 const {data:ud,error:ue}=await db.auth.getUser();
 if(ue) throw ue;
 const u=ud.user;if(!u) throw new Error("User session not found.");
 const p=await db.from("profiles").select("id,username,full_name,dob,grade,address,school,whatsapp,phone,avatar_url,role").eq("id",u.id).maybeSingle();
 if(p.error) throw new Error(`Profile load failed: ${p.error.message}`);
 if(!p.data){
   const meta=u.user_metadata||{};
   const np={id:u.id,username:meta.username||u.email?.split("@")[0]||"student",full_name:meta.full_name||u.email?.split("@")[0]||"Student",dob:meta.dob||null,grade:meta.grade?Number(meta.grade):null,address:meta.address||"",school:meta.school||"",whatsapp:meta.whatsapp||"",phone:meta.phone||"",avatar_url:null};
   const ins=await db.from("profiles").insert(np).select().single();
   if(ins.error) throw new Error(`Profile create failed: ${ins.error.message}`);
   S.p=ins.data;
 }else S.p=p.data;
 S.admin=S.p.role==="admin";
 S.warnings=[];
 const queries=[
  ["subjects",db.from("subjects").select("id,name").order("name")],
  ["recordings",db.from("recordings").select("id,subject_id,subject_name,grade,month,class_date,title,youtube_url,is_free").order("class_date",{ascending:false})],
  ["timetable",db.from("timetable").select("id,subject,subject_name,grade,day,time").order("id")],
  ["class_fees",db.from("class_fees").select("id,grade,subject_name,month,amount,note").order("id",{ascending:false})],
  ["class_grades",db.from("class_grades").select("grade").order("grade")],
  ["class_months",db.from("class_months").select("id,name").order("id")],
  ["recording_access",S.admin ? db.from("recording_access").select("student_id,recording_id") : db.from("recording_access").select("recording_id").eq("student_id",u.id)]
 ];
 const rs=await Promise.all(queries.map(x=>x[1]));
 S.subjects=rs[0].error?(S.warnings.push(`Subjects: ${rs[0].error.message}`),[]):(rs[0].data||[]);
 S.recordings=rs[1].error?(S.warnings.push(`Recordings: ${rs[1].error.message}`),[]):(rs[1].data||[]);
 S.times=rs[2].error?(S.warnings.push(`Timetable: ${rs[2].error.message}`),[]):(rs[2].data||[]);
 S.fees=rs[3].error?(S.warnings.push(`Fees: ${rs[3].error.message}`),[]):(rs[3].data||[]);
 S.grades=rs[4].error?(S.warnings.push(`Grades: ${rs[4].error.message}`),[]):(rs[4].data||[]);
 S.months=rs[5].error?(S.warnings.push(`Months: ${rs[5].error.message}`),[]):(rs[5].data||[]);
 S.access=rs[6].error?(S.warnings.push(`Recording access: ${rs[6].error.message}`),[]):(rs[6].data||[]);
 if(!S.grades.length) S.grades=grades.map(g=>({grade:Number(g)}));
 if(!S.months.length) S.months=months.map((name,i)=>({id:i+1,name}));
 if(S.admin){const x=await db.from("profiles").select("id,username,full_name,dob,grade,address,school,whatsapp,phone,avatar_url,role,created_at").order("created_at",{ascending:false});if(x.error)S.warnings.push(`Students: ${x.error.message}`);else S.students=x.data||[];}
}

function applyTheme(){
  const dark=localStorage.getItem("vidma-theme")==="dark";
  document.documentElement.classList.toggle("dark",dark);
}
function toggleTheme(){
  const dark=!document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark",dark);
  localStorage.setItem("vidma-theme",dark?"dark":"light");
  const b=document.getElementById("themeToggle");
  if(b)b.innerHTML=dark?"☀️ <span>Light</span>":"🌙 <span>Dark</span>";
}
applyTheme();

function layout(){
 let nav=[["home","🏠 Dashboard"],["times","🗓️ Timetable"],["fees","💰 Class Fees"],["rec","🎥 Recordings"],["profile","👤 Profile"]];if(S.admin)nav.push(["admin","⚙️ Admin"]);
 A.innerHTML=`<header class="top"><div class="top-brand"><img class="top-logo" src="assets/logo.png" alt="VIDMA ONLINE TAKSALAWA"><b>VIDMA ONLINE TAKSALAWA</b></div><div class="actions"><button class="btn" id="themeToggle" onclick="toggleTheme()">🌙 <span>Dark</span></button><button class="btn profileTopBtn" onclick="page('profile')">${avatarHtml(S.p?.avatar_url,S.p?.full_name||"Profile")} <span>Profile</span></button><button class="btn" onclick="out()">↪ <span>Logout</span></button></div></header><div class="layout"><aside class="side">${nav.map(n=>`<button data-n="${n[0]}" onclick="page('${n[0]}')">${n[1]}</button>`).join("")}</aside><main class="content" id="C"></main></div>`;render();if(S.warnings.length)showDataError(S.warnings.join(" | "));
}
window.page=x=>{S.page=x;render()};
function render(){document.querySelectorAll("[data-n]").forEach(x=>x.classList.toggle("on",x.dataset.n===S.page));const c=L("C");if(!c)return;if(S.page==="home")home(c);if(S.page==="times")times(c);if(S.page==="fees")fees(c);if(S.page==="rec")recs(c);if(S.page==="profile")profile(c);if(S.page==="admin")admin(c)}
function visibleRecordings(){
 if(S.admin) return S.recordings;
 const allowed=new Set(S.access.map(x=>String(x.recording_id)));
 return S.recordings.filter(x=>x.is_free===true || allowed.has(String(x.id)));
}
function home(c){
 const visible=visibleRecordings();
 const subjectMap=new Map(S.subjects.map(x=>[String(x.id),x]));
 const groups=new Map();
 visible.forEach(r=>{
   const sid=r.subject_id!=null?String(r.subject_id):"name:"+(r.subject_name||"other");
   if(!groups.has(sid)) groups.set(sid,{id:r.subject_id,name:subjectMap.get(String(r.subject_id))?.name||r.subject_name||"Class Recording",count:0});
   groups.get(sid).count++;
 });
 const subjects=[...groups.values()];
 const latest=visible.slice(0,4);
 c.innerHTML=`<div class="hero"><h2>Welcome, ${esc(S.p?.full_name||"Student")} 👋</h2><div>Your class information in one place.</div></div>
 <div class="head"><h2>🎥 Assigned / Free Recordings</h2></div>
 <div class="cards">${subjects.map(x=>`<div class="card subject" onclick="${x.id!=null?`sub(${x.id})`:`page('rec')`}"><h3>${esc(x.name)}</h3><div>${x.count} recording${x.count===1?'':'s'} • View →</div></div>`).join("")||'<div class="card empty">No assigned or free recordings yet.</div>'}</div>
 ${latest.length?`<div class="head" style="margin-top:22px"><h2>Latest Recordings</h2></div><div class="cards">${latest.map(x=>`<div class="card recordingCard"><h3>${esc(x.title||x.subject_name||"Class Recording")} ${x.is_free?`<span class="badge freeBadge">FREE</span>`:""}</h3><div>${esc(x.subject_name||"")} ${x.grade?`• Grade ${x.grade}`:""}</div><small>${esc(x.class_date||"")} ${x.month?`• ${esc(x.month)}`:""}</small><div class="videoThumb"><iframe src="${esc(ytEmbed(x.youtube_url))}" title="${esc(x.title||"YouTube recording")}" loading="lazy" allowfullscreen></iframe></div><button class="primary wide" type="button" onclick="watchRecordingById(${x.id})">▶ Watch Recording</button></div>`).join("")}</div>`:''}`;
}
window.sub=id=>{S.page="rec";render();recs(L("C"),id)};
function times(c){c.innerHTML=`<div class="head"><h2>🗓️ Timetable</h2></div><div class="tablebox"><table class="table"><tr><th>Subject</th><th>Grade</th><th>Day</th><th>Time</th></tr>${S.times.map(x=>`<tr><td>${esc(x.subject||x.subject_name)}</td><td>${x.grade||"-"}</td><td>${esc(x.day)}</td><td>${esc(x.time)}</td></tr>`).join("")||'<tr><td colspan="4" class="empty">No data</td></tr>'}</table></div>`}
function fees(c){c.innerHTML=`<div class="head"><h2>💰 Class Fees</h2></div><div class="cards">${S.fees.map(x=>`<div class="card"><span class="badge">${esc(x.subject_name||"Subject not set")}</span><h2>Rs. ${esc(x.amount)}</h2><div>Grade ${x.grade}</div>${x.note?`<div class="note">📝 ${esc(x.note)}</div>`:""}</div>`).join("")||'<div class="card empty">No data</div>'}</div>`}
function ytEmbed(url){try{let u=new URL(url);let id=u.searchParams.get("v");if(!id&&u.hostname.includes("youtu.be"))id=u.pathname.slice(1).split("/")[0];if(!id&&u.pathname.includes("/shorts/"))id=u.pathname.split("/shorts/")[1].split("/")[0];return id?`https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0`:url}catch{return url}}
window.watchRecording=x=>{modal(`▶ ${esc(x.title||x.subject_name||"Class Recording")}`,`<div class="videoWrap"><iframe src="${esc(ytEmbed(x.youtube_url))}" title="${esc(x.title||"YouTube recording")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><div style="margin-top:10px"><a class="btn" target="_blank" rel="noopener" href="${esc(x.youtube_url)}">Watch on YouTube ↗</a></div>`)};
window.watchRecordingById=id=>{const x=S.recordings.find(r=>String(r.id)===String(id));if(x)watchRecording(x)};
function recs(c,id){let base=visibleRecordings();let selected=id||"";c.innerHTML=`<div class="head"><h2>🎥 Class Recordings</h2></div><div class="card filterCard"><div class="grid3"><div class="field"><label>Grade</label><select id="rfGrade"><option value="">All Grades</option>${grades.map(g=>`<option value="${g}">${g}</option>`).join("")}</select></div><div class="field"><label>Month</label><select id="rfMonth"><option value="">All Months</option>${months.map(m=>`<option value="${m}">${m}</option>`).join("")}</select></div><div class="field"><label>Subject</label><select id="rfSubject"><option value="">සියලු Subjectයන්</option>${S.subjects.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></div></div><button class="btn" id="clearRF">Clear</button></div><div id="recordingList"></div>`;if(selected)L("rfSubject").value=String(selected);const draw=()=>{let g=L("rfGrade").value,m=L("rfMonth").value,subid=L("rfSubject").value;let a=base.filter(x=>(!g||String(x.grade)===g)&&(!m||x.month===m)&&(!subid||String(x.subject_id)===subid));let by={};a.forEach(x=>(by[x.month||"Other"]??=[]).push(x));L("recordingList").innerHTML=Object.entries(by).map(([mth,aa])=>`<h2>${esc(mth)}</h2><div class="cards">${aa.map(x=>`<div class="card recordingCard"><h3>${esc(x.title||x.subject_name||"Class Recording")} ${x.is_free?`<span class="badge freeBadge">FREE</span>`:""}</h3><div>${esc(x.subject_name||"")} ${x.grade?`• Grade ${x.grade}`:""}</div><small>${esc(x.class_date||"")}</small><div class="videoThumb"><iframe src="${esc(ytEmbed(x.youtube_url))}" title="${esc(x.title||"YouTube recording")}" loading="lazy" allowfullscreen></iframe></div><button class="primary wide" type="button" onclick='watchRecordingById(${x.id})'>▶ Watch Recording</button></div>`).join("")}</div>`).join("")||'<div class="card empty">ඔබ තෝරාගත් Grade / Month / Subject සඳහා recordings No data.</div>'};["rfGrade","rfMonth","rfSubject"].forEach(k=>L(k).onchange=draw);L("clearRF").onclick=()=>{L("rfGrade").value="";L("rfMonth").value="";L("rfSubject").value="";draw()};draw()}
function profile(c){
 let p=S.p||{};
 c.innerHTML=`<div class="head"><h2>👤 Profile</h2></div><div class="card profileCard">
   <div class="profilePictureBox">
     <div class="profileAvatarLarge">${avatarHtml(p.avatar_url,p.full_name||"Profile")}</div>
     <div><h3 style="margin:0 0 5px">Profile Picture</h3><input id="avatarFile" type="file" accept="image/*"><div class="avatarActions"><button class="primary" type="button" id="avatarUpload">Upload Photo</button>${p.avatar_url?'<button class="btn" type="button" id="avatarRemove">Remove</button>':''}</div><p id="avatarMsg" class="muted"></p></div>
   </div>
   <form id="pf"><div class="grid">${F("Full Name","full_name","text",true,p.full_name)}${F("Date of Birth","dob","date",true,p.dob)}</div><div class="grid">${SEL("Grade","grade",grades,p.grade)}${F("School","school","text",true,p.school)}</div>${F("Address","address","text",false,p.address)}<div class="grid">${F("WhatsApp","whatsapp","tel",false,p.whatsapp)}${F("Phone","phone","tel",false,p.phone)}</div><button class="primary">Save</button></form>
 </div>`;
 L("pf").full_name.disabled=L("pf").dob.disabled=true;
 L("pf").onsubmit=async e=>{e.preventDefault();let d=Object.fromEntries(new FormData(L("pf")));delete d.full_name;delete d.dob;if(!d.whatsapp&&!d.phone)return alert("WhatsApp හෝ phone එකක් අවශ්‍යයි");const {error}=await db.from("profiles").update(d).eq("id",p.id);if(error)alert(error.message);else{Object.assign(S.p,d);render();alert("Saved")}};
 L("avatarUpload").onclick=async()=>{const file=L("avatarFile")?.files?.[0];if(!file)return alert("Select a photo.");const b=L("avatarUpload"),m=L("avatarMsg");b.disabled=true;m.textContent="Uploading...";try{await uploadAvatar(file);render();alert("Profile picture uploaded.")}catch(e){m.textContent=e.message||String(e)}finally{b.disabled=false}};
 const rm=L("avatarRemove");if(rm)rm.onclick=async()=>{if(!confirm("Remove profile picture?"))return;try{await removeAvatar();render();}catch(e){alert(e.message||String(e))}};
}
function modal(title,body){document.querySelector("#M")?.remove();document.body.insertAdjacentHTML("beforeend",`<div class="modal" id="M"><div class="modalbox"><div class="modalhead"><h2>${title}</h2><button class="btn" onclick="document.querySelector('#M')?.remove()">✕</button></div>${body}</div></div>`)}
const save=async(table,d,id)=>{
 const q=id?db.from(table).update(d).eq("id",id).select().single():db.from(table).insert(d).select().single();
 const {data,error}=await q;
 if(error){alert(error.message);return;}
 const row=data;
 const key={subjects:"subjects",recordings:"recordings",timetable:"times",class_fees:"fees"}[table];
 if(key){
   const arr=S[key]||[];
   const idx=id?arr.findIndex(x=>String(x.id)===String(id)):-1;
   if(idx>=0) arr[idx]=row; else arr.push(row);
   S[key]=arr;
 }else if(table==="profiles" && id){
   const idx=S.students.findIndex(x=>String(x.id)===String(id));
   if(idx>=0) S.students[idx]={...S.students[idx],...row};
 }
 document.querySelector("#M")?.remove();
 render();
};
window.admin=c=>{c.innerHTML=`<div class="head"><div><h2>⚙️ Admin Dashboard</h2><div>Manage students, subjects, recordings, timetable and fees.</div></div></div><div class="cards"><div class="card"><b>Students</b><h2>${S.students.length}</h2></div><div class="card"><b>Subjects</b><h2>${S.subjects.length}</h2></div><div class="card"><b>Recordings</b><h2>${S.recordings.length}</h2></div></div>
<div class="head adminSectionHead"><h2>🎥 Recordings</h2><div class="adminSectionActions"><button class="primary" onclick="recording()">+ Add</button><button class="btn" id="recordingMoreBtn" onclick="toggleAdminSection('recordings')">View More</button></div></div><div id="adminRecordingsSection" class="adminCollapsible"><div class="tablebox"><table class="table"><tr><th>Title</th><th>Subject</th><th>Grade</th><th>Month</th><th>Date</th><th>Access</th><th></th></tr><tbody id="adminRecordingRows"></tbody></table></div></div>
<div class="head"><h2>📚 Subjects</h2><button class="primary" onclick="subject()">+ Add</button></div><div class="tablebox"><table class="table"><tr><th>Subject</th><th></th></tr>${S.subjects.map(x=>`<tr><td>${esc(x.name)}</td><td><button class="btn" onclick="subject(${x.id})">Edit</button> <button class="btn danger" onclick="del('subjects',${x.id})">Delete</button></td></tr>`).join("")||'<tr><td colspan="2" class="empty">Subjects No data</td></tr>'}</table></div>
<div class="head"><h2>🗓️ Timetable</h2><button class="primary" onclick="time()">+ Add</button></div><div class="tablebox"><table class="table"><tr><th>Subject</th><th>Grade</th><th>Day</th><th>Time</th><th></th></tr>${S.times.map(x=>`<tr><td>${esc(x.subject||x.subject_name)}</td><td>${x.grade}</td><td>${esc(x.day)}</td><td>${esc(x.time)}</td><td><button class="btn" onclick="time(${x.id})">Edit</button> <button class="btn danger" onclick="del('timetable',${x.id})">Delete</button></td></tr>`).join("")||'<tr><td colspan="5" class="empty">Timetable No data</td></tr>'}</table></div>
<div class="head"><h2>💰 Fees</h2><button class="primary" onclick="fee()">+ Add</button></div><div class="tablebox"><table class="table"><tr><th>Grade</th><th>Subject</th><th>Amount</th><th>Note</th><th></th></tr>${S.fees.map(x=>`<tr><td>${x.grade}</td><td>${esc(x.subject_name||"-")}</td><td>Rs. ${x.amount}</td><td>${esc(x.note||"-")}</td><td><button class="btn" onclick="fee(${x.id})">Edit</button> <button class="btn danger" onclick="del('class_fees',${x.id})">Delete</button></td></tr>`).join("")||'<tr><td colspan="5" class="empty">Fees No data</td></tr>'}</table></div>
<div class="head adminSectionHead"><div><h2>👥 Students</h2><input id="search" placeholder="Name / WhatsApp" oninput="studentRows()"></div><button class="btn" id="studentMoreBtn" onclick="toggleAdminSection('students')">View More</button></div><div id="adminStudentsSection" class="adminCollapsible"><div class="tablebox"><table class="table"><tr><th>Name</th><th>WhatsApp</th><th>Phone</th><th>Grade</th><th>School</th><th>Actions</th></tr><tbody id="SR"></tbody></table></div></div>`;window._adminExpanded={recordings:false,students:false};adminRecordingRows();studentRows()};
window._adminExpanded={recordings:false,students:false};
window.toggleAdminSection=section=>{window._adminExpanded=window._adminExpanded||{};window._adminExpanded[section]=!window._adminExpanded[section];if(section==='recordings')adminRecordingRows();if(section==='students')studentRows()};
window.adminRecordingRows=()=>{const el=L('adminRecordingRows');if(!el)return;const expanded=!!window._adminExpanded?.recordings;const all=S.recordings||[];const rows=expanded?all:all.slice(0,5);el.innerHTML=rows.map(x=>`<tr><td>${esc(x.title||"-")}</td><td>${esc(x.subject_name||"-")}</td><td>${esc(x.grade||"-")}</td><td>${esc(x.month||"-")}</td><td>${esc(x.class_date||"-")}</td><td>${x.is_free?`<span class="badge freeBadge">FREE</span>`:`Paid / Assigned`}</td><td><button class="btn" onclick="recording(${x.id})">Edit</button> <button class="btn danger" onclick="del('recordings',${x.id})">Delete</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">Recordings No data</td></tr>';const b=L('recordingMoreBtn');if(b)b.textContent=expanded?'View Less':'View More';b&&(b.style.display=all.length>5?'inline-flex':'none')};
window.studentRows=()=>{let q=(L("search")?.value||"").toLowerCase();let all=S.students.filter(x=>(x.full_name||"").toLowerCase().includes(q)||(x.whatsapp||"").toLowerCase().includes(q));const expanded=!!window._adminExpanded?.students;const rows=expanded?all:all.slice(0,5);L("SR").innerHTML=rows.map(x=>`<tr><td>${esc(x.full_name)}</td><td>${esc(x.whatsapp||"-")}</td><td>${esc(x.phone||"-")}</td><td>${x.grade||"-"}</td><td>${esc(x.school||"-")}</td><td><button class="btn" onclick="student('${x.id}')">View / Edit</button> <button class="primary" onclick="studentRecording('${x.id}')">🎥 Update Recording</button></td></tr>`).join("")||'<tr><td colspan="6" class="empty">Students No data</td></tr>';const b=L('studentMoreBtn');if(b)b.textContent=expanded?'View Less':'View More';b&&(b.style.display=all.length>5?'inline-flex':'none')};
window.studentRecording=async id=>{
 const st=S.students.find(x=>String(x.id)===String(id));
 if(!st)return;
 const dynamicGrades=[...new Set([...S.grades.map(x=>x.grade),...S.students.map(x=>x.grade).filter(Boolean),...S.recordings.map(x=>x.grade).filter(Boolean)])].sort((a,b)=>Number(a)-Number(b));
 const dynamicSubjects=[...S.subjects].sort((a,b)=>String(a.name).localeCompare(String(b.name)));
 const allMonths=[...new Set([...S.months.map(x=>x.name),...S.recordings.map(x=>x.month).filter(Boolean)])];
 const freeIds=new Set(S.recordings.filter(r=>r.is_free===true).map(r=>String(r.id)));
 let pending=new Set([...S.access.filter(x=>String(x.student_id||st.id)===String(st.id)).map(x=>String(x.recording_id)), ...freeIds]);
 modal(`🎥 ${esc(st.full_name)} — Recording Update`,
 `<div class="card" style="margin-bottom:14px"><b>Student:</b> ${esc(st.full_name)} &nbsp; <b>Current Grade:</b> ${esc(st.grade||"-")}<p class="muted">Select the recordings this student can view here. Use the <b>+</b> buttons to add new Grade / Subject / Month values.</p></div>
 <div class="grid3">
   <div class="field"><label>Grade</label><div class="inlineAdd"><select id="srGrade"><option value="">All Grades</option>${dynamicGrades.map(g=>`<option value="${esc(g)}" ${String(g)===String(st.grade)?"selected":""}>${esc(g)}</option>`).join("")}</select><button class="btn plusBtn" type="button" title="Add Grade" onclick="gradeManager('${st.id}')">+</button></div></div>
   <div class="field"><label>Subject</label><div class="inlineAdd"><select id="srSubject"><option value="">All Subjects</option>${dynamicSubjects.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("")}</select><button class="btn plusBtn" type="button" title="Add Subject" onclick="subjectForStudent('${st.id}')">+</button></div></div>
   <div class="field"><label>Month</label><div class="inlineAdd"><select id="srMonth"><option value="">All Months</option>${allMonths.map(m=>`<option value="${esc(m)}">${esc(m)}</option>`).join("")}</select><button class="btn plusBtn" type="button" title="Add Month" onclick="monthManager('${st.id}')">+</button></div></div>
 </div>
 <div class="head" style="margin-top:8px"><h3 style="margin:0">Recordings</h3><button class="primary" type="button" onclick="saveStudentRecordingAccess('${st.id}')">💾 Save Access</button></div>
 <div id="studentRecordingResults"></div>`);
 const syncVisibleChecks=()=>document.querySelectorAll('.recordingAccessCheck').forEach(el=>{if(el.checked)pending.add(String(el.value));else pending.delete(String(el.value));});
 const draw=()=>{
   const g=L('srGrade')?.value||'',sub=L('srSubject')?.value||'',m=L('srMonth')?.value||'';
   const rows=S.recordings.filter(r=>(!g||String(r.grade)===String(g))&&(!sub||String(r.subject_id)===String(sub))&&(!m||String(r.month)===String(m)));
   L('studentRecordingResults').innerHTML=rows.map(r=>`<label class="accessRow card"><div class="accessMain"><input class="recordingAccessCheck" type="checkbox" value="${esc(r.id)}" ${pending.has(String(r.id))?'checked':''} ${r.is_free?'disabled':''}><div><b>${esc(r.title||r.subject_name||'Recording')}</b><div class="muted">${esc(r.subject_name||'')} · Grade ${esc(r.grade||'-')} · ${esc(r.month||'-')} · ${esc(r.class_date||'')} ${r.is_free?'· FREE':''}</div></div></div><button class="btn" type="button" onclick="watchRecordingById(${r.id})">▶ Watch</button></label>`).join('')||'<div class="card empty">මෙම filters වලට recordings නැහැ.</div>';
   L('studentRecordingResults').querySelectorAll('.recordingAccessCheck').forEach(el=>el.onchange=()=>{if(el.checked)pending.add(String(el.value));else pending.delete(String(el.value));});
 };
 ['srGrade','srMonth','srSubject'].forEach(k=>L(k).onchange=()=>{syncVisibleChecks();draw();});
 draw();
 window._studentAccessPending=pending;
};
window.saveStudentRecordingAccess=async studentId=>{
 const pending=window._studentAccessPending||new Set();
 const current=new Set(S.access.filter(x=>String(x.student_id||studentId)===String(studentId)).map(x=>String(x.recording_id)));
 const freeIds=new Set(S.recordings.filter(r=>r.is_free===true).map(r=>String(r.id)));
 const add=[...pending].filter(id=>!current.has(id) && !freeIds.has(String(id))).map(id=>({student_id:studentId,recording_id:Number(id)}));
 const remove=[...current].filter(id=>!pending.has(id) && !freeIds.has(String(id)));
 if(add.length){const r=await db.from('recording_access').insert(add).select('student_id,recording_id');if(r.error){alert(r.error.message);return;} S.access.push(...(r.data||[]));}
 if(remove.length){const r=await db.from('recording_access').delete().eq('student_id',studentId).in('recording_id',remove.map(Number));if(r.error){alert(r.error.message);return;} S.access=S.access.filter(x=>!(String(x.student_id||studentId)===String(studentId)&&remove.includes(Number(x.recording_id))));}
 
 document.querySelector('#M')?.remove();
 alert('Student recording access updated.');
};
window.subjectForStudent=studentId=>{let x={};modal('Add Subject',`<form id="studentSubjectForm">${F('Subject','name','text',true,x.name)}<p class="muted">A Grade is not required for a Subject. Student recording access can be filtered by Grade.</p><button class="primary">Save</button></form>`);L('studentSubjectForm').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(L('studentSubjectForm')));const r=await db.from('subjects').insert(d).select('id,name').single();if(r.error)alert(r.error.message);else{S.subjects.push(r.data);document.querySelector('#M')?.remove();studentRecording(studentId);}}};
window.recordingForStudent=(studentId,id)=>{const st=S.students.find(x=>String(x.id)===String(studentId));const x=S.recordings.find(y=>y.id==id)||{};const currentGrades=[...new Set([...S.grades.map(a=>a.grade),...S.students.map(a=>a.grade).filter(Boolean),...S.recordings.map(a=>a.grade).filter(Boolean),5,6,7,8,9,10,11])].sort((a,b)=>Number(a)-Number(b));const subjectOptions=S.subjects.map(s=>s.id+"|"+s.name);const monthOptions=[...new Set([...S.months.map(a=>a.name),...S.recordings.map(r=>r.month).filter(Boolean),...months])];modal(id?"Edit Recording":"Add Recording",`<form id="rfForm">${st?`<p class="muted">Student: <b>${esc(st.full_name)}</b></p>`:""}${SEL("Subject","subject_id",subjectOptions,x.subject_id)}${SEL("Grade","grade",currentGrades,x.grade||st?.grade||5)}${SEL("Month","month",monthOptions,x.month||"January")}${F("දිනය","class_date","date",true,x.class_date)}${F("Title (optional)","title","text",false,x.title)}${F("YouTube Link","youtube_url","url",true,x.youtube_url)}<label class="checkField"><input type="checkbox" name="is_free" ${x.is_free?'checked':''}> <b>Free Recording</b><span> — Students can view this without individual access assignment.</span></label><button class="primary">Save</button></form>`);L("rfForm").onsubmit=e=>{e.preventDefault();let d=Object.fromEntries(new FormData(L("rfForm"))),s=S.subjects.find(a=>String(a.id)===String(d.subject_id));d.grade=+d.grade;d.subject_id=+d.subject_id;d.subject_name=s?.name||"";d.is_free=d.is_free==='on';save("recordings",d,id)} };
window.gradeManager=studentId=>{const existing=[...new Set([...S.grades.map(x=>x.grade),...S.students.map(x=>x.grade).filter(Boolean),...S.recordings.map(x=>x.grade).filter(Boolean)])].sort((a,b)=>Number(a)-Number(b));modal("🎓 Add Grade",`<form id="gradeForm">${F("Grade","grade","number",true)}<p class="muted">You can add a Grade from 5 to 11.</p><button class="primary">Add Grade</button></form><div class="card" style="margin-top:12px"><b>Current Grades</b><div style="margin-top:8px">${existing.map(g=>`<span class="badge" style="display:inline-block;margin:3px">${esc(g)}</span>`).join("")}</div></div>`);L("gradeForm").onsubmit=async e=>{e.preventDefault();const g=Number(Object.fromEntries(new FormData(L("gradeForm"))).grade);if(!Number.isInteger(g)||g<5||g>11)return alert("Grade must be a number from 5 to 11.");const {error}=await db.from("class_grades").upsert({grade:g},{onConflict:"grade"});if(error)alert(error.message);else{if(!S.grades.some(x=>Number(x.grade)===g))S.grades.push({grade:g});document.querySelector("#M")?.remove();if(studentId)studentRecording(studentId);else {render();alert("Grade added");}}}};
window.monthManager=studentId=>{const existing=[...new Set([...S.months.map(x=>x.name),...S.recordings.map(r=>r.month).filter(Boolean),...months])];modal("📅 Add Month",`<form id="monthForm">${F("Month name","month","text",true)}<p class="muted">Add a month such as January or another period name.</p><button class="primary">Add Month</button></form><div class="card" style="margin-top:12px"><b>Current Months</b><div style="margin-top:8px">${existing.map(m=>`<span class="badge" style="display:inline-block;margin:3px">${esc(m)}</span>`).join("")}</div></div>`);L("monthForm").onsubmit=async e=>{e.preventDefault();const m=Object.fromEntries(new FormData(L("monthForm"))).month.trim();if(!m)return;const {data:created,error}=await db.from("class_months").insert({name:m}).select("id,name").single();if(error){if(String(error.message).toLowerCase().includes("duplicate"))alert("This Month already exists.");else alert(error.message)}else{S.months.push(created);document.querySelector("#M")?.remove();if(studentId)studentRecording(studentId);else {render();alert("Month added");}}}};

window.student=id=>{let x=S.students.find(y=>y.id===id);modal("Student Details",`<form id="sf">${F("Full Name","full_name","text",true,x.full_name)}${F("Date of Birth","dob","date",true,x.dob)}${SEL("Grade","grade",grades,x.grade)}${F("Address","address","text",true,x.address)}${F("School","school","text",true,x.school)}<div class="grid">${F("WhatsApp","whatsapp","tel",false,x.whatsapp)}${F("Phone","phone","tel",false,x.phone)}</div>${SEL("Role","role",["student","admin"],x.role||"student")}<button class="primary">Update</button></form>`);L("sf").onsubmit=e=>{e.preventDefault();let d=Object.fromEntries(new FormData(L("sf")));d.grade=+d.grade;save("profiles",d,id)}};
window.subject=id=>{let x=S.subjects.find(y=>y.id==id)||{};modal(id?"Edit Subject":"Add Subject",`<form id="f">${F("Subject","name","text",true,x.name)}<p class="muted">A Grade is not required for a Subject. Student recording access can be filtered by Grade. Student recording බලන වෙලාවේ Grade filter එකෙන් තෝරාගන්න පුළුවන්.</p><button class="primary">Save</button></form>`);L("f").onsubmit=e=>{e.preventDefault();let d=Object.fromEntries(new FormData(L("f")));save("subjects",d,id)}};
window.recording=id=>{let x=S.recordings.find(y=>y.id==id)||{};modal(id?"Edit Recording":"Add Recording",`<form id="f">${SEL("Subject","subject_id",S.subjects.map(s=>s.id+"|"+s.name),x.subject_id)}${SEL("Grade","grade",grades,x.grade||5)}${SEL("Month","month",months,x.month||"January")}${F("දිනය","class_date","date",true,x.class_date)}${F("Title (optional)","title","text",false,x.title)}${F("YouTube Link","youtube_url","url",true,x.youtube_url)}<label class="checkField"><input type="checkbox" name="is_free" ${x.is_free?'checked':''}> <b>Free Recording</b><span> — Students can view this without individual access assignment.</span></label><button class="primary">Save</button></form>`);L("f").onsubmit=e=>{e.preventDefault();let d=Object.fromEntries(new FormData(L("f"))),s=S.subjects.find(a=>a.id==d.subject_id);d.grade=+d.grade;d.subject_id=+d.subject_id;d.subject_name=s?.name||"";d.is_free=d.is_free==='on';save("recordings",d,id)}};
window.time=id=>{let x=S.times.find(y=>y.id==id)||{};modal(id?"Edit Time":"Add Time",`<form id="f">${F("Subject","subject","text",true,x.subject||x.subject_name)}${SEL("Grade","grade",grades,x.grade||5)}${SEL("Day","day",days,x.day||"Monday")}${F("Time","time","text",true,x.time)}<button class="primary">Save</button></form>`);L("f").onsubmit=e=>{e.preventDefault();let d=Object.fromEntries(new FormData(L("f")));d.grade=+d.grade;d.subject_name=d.subject;save("timetable",d,id)}};
window.fee=id=>{let x=S.fees.find(y=>y.id==id)||{};const currentSubject=x.subject_name||"";modal(id?"Edit Fee":"Add Fee",`<form id="f">${SEL("Grade","grade",grades,x.grade||5)}${SEL("Subject","subject_name",S.subjects.map(s=>s.name),currentSubject)}${F("Fee Amount","amount","number",true,x.amount)}${F("Note (optional)","note","text",false,x.note||"")}<button class="primary">Save</button></form>`);L("f").onsubmit=e=>{e.preventDefault();let d=Object.fromEntries(new FormData(L("f")));d.grade=+d.grade;d.subject_name=String(d.subject_name||"").trim();d.amount=+d.amount;delete d.subject_id;delete d.month;if(!d.subject_name)return alert("Please select a subject.");save("class_fees",d,id)}};
window.del=async(t,id)=>{
 if(!confirm("Delete this item?"))return;
 const {error}=await db.from(t).delete().eq("id",id);
 if(error){alert(error.message);return;}
 const key={subjects:"subjects",recordings:"recordings",timetable:"times",class_fees:"fees",class_grades:"grades",class_months:"months"}[t];
 if(key) S[key]=(S[key]||[]).filter(x=>String(x.id)!==String(id));
 render();
};
window.out=async()=>{
  if(!db)return;
  const btns=document.querySelectorAll('.actions .btn');btns.forEach(b=>b.disabled=true);
  try{
    await db.auth.signOut({scope:"local"});
  }catch(e){console.warn("Local sign-out warning",e)}
  // Remove only Supabase auth entries for this project. Never clear all localStorage.
  try{
    const host=new URL(SUPABASE_URL).hostname;
    const ref=host.split(".")[0];
    for(const k of Object.keys(localStorage)) if(k.startsWith("sb-") && k.includes(ref)) localStorage.removeItem(k);
    for(const k of Object.keys(sessionStorage)) if(k.startsWith("sb-") && k.includes(ref)) sessionStorage.removeItem(k);
  }catch(e){}
  S={page:"home",p:null,admin:false,subjects:[],recordings:[],times:[],fees:[],students:[],grades:[],months:[],access:[],warnings:[]};
  bootDone = false;
  auth("Logged out. You can login again now.");
};
function showDataError(message){const old=L("dataError");if(old)old.remove();const el=document.createElement("div");el.id="dataError";el.style.cssText="position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;background:#fff3cd;color:#664d03;border:1px solid #ffecb5;border-radius:12px;padding:14px 16px;box-shadow:0 8px 30px rgba(0,0,0,.12);font-family:inherit";el.innerHTML=`<b>Data load notice</b><br><span>${esc(message)}</span><button style="float:right;border:0;background:transparent;font-size:18px;cursor:pointer" onclick="this.parentElement.remove()">✕</button>`;document.body.appendChild(el)}
let booting = false;
let bootDone = false;
async function boot(){
  if(booting || bootDone) return;
  booting = true;
  try{
    if(!db){ auth((isLegacyServiceRoleKey||isSecretStyleKey)?"Security error: config.js එකට secret/service_role key එකක් දාන්න එපා.":"Configure config.js."); return; }
    const {data:x,error}=await db.auth.getSession();
    if(error) throw error;
    if(!x.session){ auth(); return; }
    await loadData();
    layout();
    bootDone = true;
  }catch(e){
    console.error(e);
    auth(`Login succeeded, but there was a data loading issue: ${e.message||e}`);
  }finally{
    booting = false;
  }
}
// Deliberately no auth-state listener here. Login/logout explicitly control the UI,
// which prevents SIGNED_IN/SIGNED_OUT -> boot() feedback loops and duplicate requests.
boot();
