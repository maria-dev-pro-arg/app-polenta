import {firebaseConfig} from './firebase-config.js';

const configured = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
const status = (message)=>window.dispatchEvent(new CustomEvent('polenta-cloud-state',{detail:{message}}));
const local = ()=>window.PolentaLocal;
const popup = document.createElement('dialog');
popup.id = 'accountDialog';
document.body.append(popup);
function message(text){const el=popup.querySelector('#accountMessage');if(el)el.textContent=text;}
function htmlEscape(s){return String(s||'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[x]));}
const ACCOUNT_OWNER_KEY='app-polenta-cloud-owner-v1';
let user=null, auth=null, db=null, sdk=null, ready=false;
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase();
const machineKey=m=>normalize(m.name)+'|'+normalize(m.group);
const ownedBy=()=>localStorage.getItem(ACCOUNT_OWNER_KEY);
function show(){
  popup.innerHTML=`<h3>Mi cuenta APP</h3><p class="help">La cuenta es opcional. El entrenamiento funciona sin registrarte. Los datos locales no se borran al iniciar sesión ni al cerrar sesión.</p>
    <p id="accountMessage" class="help" role="status"></p>
    ${user?`<p>Sesión iniciada: <strong>${htmlEscape(user.email)}</strong></p>
      <p class="help">La sincronización es manual y conserva tus datos locales. Antes de sincronizar, APP descarga un respaldo y comprueba si hay conflictos entre dispositivos. No sincroniza las fotos.</p>
      <div class="actions"><button type="button" class="btn primary" id="syncNow">Sincronizar ahora</button><button type="button" class="btn" id="logout">Cerrar sesión</button></div>`:
    `<form id="accountForm"><label class="fieldlabel">Correo electrónico</label><input class="field" type="email" name="email" required autocomplete="email">
       <label class="fieldlabel">Contraseña (mínimo 6 caracteres)</label><input class="field" type="password" name="password" required minlength="6" autocomplete="current-password">
       <div class="actions"><button class="btn primary" name="mode" value="login">Ingresar</button><button class="btn" name="mode" value="signup">Crear cuenta</button></div>
     </form><button type="button" class="btn small" id="resetPassword">Recuperar contraseña</button>`}
    <div class="actions"><button type="button" class="btn" id="closeAccount">Cerrar</button></div>`;
  popup.showModal();
  popup.querySelector('#closeAccount').onclick=()=>popup.close();
  const form=popup.querySelector('#accountForm');
  if(form)form.addEventListener('submit',async e=>{
    e.preventDefault();
    const button=e.submitter;
    if(!button)return;
    const email=form.elements.email.value.trim();
    const password=form.elements.password.value;
    try{
      message('Verificando cuenta…');
      if(button.value==='signup') await sdk.createUserWithEmailAndPassword(auth,email,password);
      else await sdk.signInWithEmailAndPassword(auth,email,password);
    }catch(err){message('No se pudo acceder: '+friendly(err))}
  });
  popup.querySelector('#resetPassword')?.addEventListener('click',async ()=>{
    const email=form.elements.email.value.trim();
    if(!email){message('Ingresá tu correo electrónico primero.');return}
    try{await sdk.sendPasswordResetEmail(auth,email);message('Si el correo corresponde a una cuenta, recibirás instrucciones para restablecer tu contraseña.')}
    catch(err){message('No se pudo solicitar el restablecimiento: '+friendly(err))}
  });
  popup.querySelector('#logout')?.addEventListener('click',async()=>{try{await sdk.signOut(auth)}catch(err){message(friendly(err))}});
  popup.querySelector('#syncNow')?.addEventListener('click',synchronize);
}
function friendly(err){const code=String(err?.code||'');
  if(code.includes('network'))return 'Sin conexión. Tus datos locales siguen a salvo.';
  if(code.includes('permission-denied'))return 'Firestore rechazó el acceso. Revisá las reglas de seguridad.';
  if(code.includes('invalid-credential')||code.includes('wrong-password'))return 'Correo o contraseña incorrectos.';
  if(code.includes('email-already-in-use'))return 'Ese correo ya tiene una cuenta.';
  return code || 'Error inesperado. No se modificaron tus registros locales.';
}
function portable(obj,kind){
  if(kind==='machines'){const {photo,...rest}=obj;return rest;}
  return obj;
}
function canonical(obj){return JSON.stringify(Object.fromEntries(Object.entries(obj).sort(([a],[b])=>a.localeCompare(b))));}
async function synchronize(){
  const btn=popup.querySelector('#syncNow');
  if(!user || !navigator.onLine){message('Necesitás conexión e iniciar sesión.');return}
  if(btn)btn.disabled=true;
  try{
    const owner=ownedBy();
    if(owner&&owner!==user.uid)throw Error('Estos datos locales ya se vincularon a otra cuenta. Para proteger la privacidad, no se pueden subir a esta cuenta. Exportá un respaldo y usá un perfil de navegador separado.');
    const snap=local().getSnapshot();
    local().exportBackup();
    message('Revisando datos, sin sobrescribir registros existentes…');

    const types=['machines','plans','history'];
    const remote={machines:[],plans:[],history:[]},existingDocs={},adds=[],idMap={};
    for(const kind of types){
      const path=sdk.collection(db,'users',user.uid,kind);
      const docs=await sdk.getDocs(path);
      existingDocs[kind]=new Map(docs.docs.map(d=>[d.id,d.data()]));
      remote[kind]=[...existingDocs[kind].values()];
    }
    // Mapear máquinas equivalentes entre dispositivos, conservando siempre los ID de la nube.
    const byCatalog=new Map(remote.machines.filter(m=>m.catalogKey).map(m=>[m.catalogKey,m]));
    const byName=new Map(remote.machines.map(m=>[machineKey(m),m]));
    for(const m of snap.machines){
      const match=(m.catalogKey&&byCatalog.get(m.catalogKey))||byName.get(machineKey(m));
      if(match&&match.id!==m.id)idMap[m.id]=match.id;
    }
    const mapped=kind=>snap[kind].map(entry=>{
      if(kind==='machines')return {...entry,id:idMap[entry.id]||entry.id};
      if(kind==='plans')return {...entry,ids:[...new Set((entry.ids||[]).map(id=>idMap[id]||id))]};
      return {...entry,items:(entry.items||[]).map(it=>({...it,id:idMap[it.id]||it.id}))};
    });
    for(const kind of types){
      const existing=existingDocs[kind];
      for(const entry of mapped(kind)){
        if(typeof entry.id!=='string'||!entry.id||entry.id.includes('/'))throw Error('Encontramos un identificador inválido en '+kind);
        const flat=portable(entry,kind);
        const prev=existing.get(entry.id);
        if(prev){
          if(kind==='machines' && idMap[snap.machines.find(m=>m.id===entry.id)?.id]){
            // La máquina equivalente de la cuenta es la referencia autorizada.
            continue;
          }
          if(kind==='machines' && Object.values(idMap).includes(entry.id))continue;
          if(canonical(prev)!==canonical(flat)){
            if(kind==='machines' && snap.machines.some(m=>m.id===entry.id&&m.catalogKey&&!m.lastWeight&&!m.photo))continue;
            throw Error('Hay registros distintos para el mismo ID de '+kind+'. Se detuvo la sincronización para no sobrescribir cambios. Exportá respaldos de ambos dispositivos.');
          }
        }else adds.push({path:sdk.doc(db,'users',user.uid,kind,entry.id),value:flat});
      }
    }
    if(adds.length>400)throw Error('Hay más de 400 registros nuevos. Esta versión piloto necesita sincronización por lotes antes de continuar.');
    if(adds.length){
      const batch=sdk.writeBatch(db);
      adds.forEach(({path,value})=>batch.set(path,value));
      await batch.commit();
    }
    local().mergeSnapshot(remote,idMap);
    localStorage.setItem(ACCOUNT_OWNER_KEY,user.uid);
    message(`Sincronización completada: ${adds.length} registros nuevos enviados. Datos locales conservados. Las fotos permanecen en este dispositivo.`);
  }catch(err){message('No se completó la sincronización: '+friendly(err)+(err?.message && !err?.code?' '+err.message:''));}
  finally{if(btn)btn.disabled=false;}
}
window.PolentaCloud={openAccount:()=>{
  if(!configured){alert('Falta configurar Firebase. El modo sin cuenta sigue funcionando.');return}
  if(!ready){alert('No se pudo cargar Firebase. Comprobá la conexión y recargá.');return}
  show();
}};
if(!configured){status('Modo sin cuenta · Firebase aún no configurado');}
else{
  try{
    const v='13.2.0', root='https://www.gstatic.com/firebasejs/'+v+'/';
    const [appMod,authMod,firestoreMod]=await Promise.all([
      import(root+'firebase-app.js'),
      import(root+'firebase-auth.js'),
      import(root+'firebase-firestore.js')]);
    const app=appMod.initializeApp(firebaseConfig);
    auth=authMod.getAuth(app);db=firestoreMod.getFirestore(app);
    sdk={...authMod,...firestoreMod};
    authMod.onAuthStateChanged(auth,u=>{
      user=u;ready=true;
      status(u?(ownedBy()&&ownedBy()!==u.uid?`Cuenta distinta: ${u.email} · los datos locales pertenecen a otra cuenta`:`Conectada: ${u.email} · sincronización manual`):'Modo sin cuenta · datos guardados en este dispositivo');
      if(popup.open){popup.close();show();}
    });
  }catch(err){status('Modo sin cuenta · Firebase no disponible');console.error('Firebase:',err)}
}
