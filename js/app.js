// Semua komunikasi ke Google Apps Script lewat fetch (JSON). GAS_URL diatur di js/config.js
// text/plain dipakai agar browser tidak mengirim preflight CORS yang ditolak GAS.
function post(body){
  return fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)}).then(r=>r.json());
}
const TH=[['Koreksi Aritmatik','#4F46E5','#EEF2FF'],['Administrasi','#0284C7','#F0F9FF'],['Teknis','#0D9488','#F0FDFA'],['Harga','#D97706','#FFFBEB'],['Kualifikasi','#EA580C','#FFF7ED'],['Pembuktian Kualifikasi','#E11D48','#FFF1F2'],['Calon Pemenang','#059669','#ECFDF5']];
const HS={MS:'Memenuhi',TMS:'Gugur',KLR:'Klarifikasi',NA:'Tidak berlaku'};
const BC={MS:'ok',TMS:'bad',KLR:'warn',NA:'part'};
const NAV=[['dash','Dashboard','▦'],['paket','Daftar Paket','☰'],['eval','Evaluasi 0-6','✔'],['rekap','Rekapitulasi','◫'],['klar','Klarifikasi','✎'],['akun','Kelola Akun','⚙']];
let S={t:null,u:null,r:null,d:{},v:'dash',pk:'',ps:'',th:0};
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rp=n=>'Rp '+Number(n||0).toLocaleString('id-ID');
const isA=()=>S.r==='Admin';
function toast(m,e){const t=$('#toast');t.textContent=m;t.className='toast'+(e?' e':'');t.hidden=false;setTimeout(()=>t.hidden=true,3200)}
function spin(on){$('#spin').hidden=!on}

function doLogin(){
  const n=$('#ln').value.trim(),p=$('#lp').value.trim();
  if(!n||!p)return toast('Nama dan PIN wajib diisi',1);
  spin(1);
  post({action:'login',nama:n,pin:p}).then(r=>{spin(0);
    if(!r.success)return toast(r.message,1);
    S.t=r.data.token;S.u=r.data.nama;S.r=r.data.peran;
    $('#login').hidden=true;$('#app').hidden=false;$('#hw').textContent='Selamat datang, '+S.u;$('#wr').textContent=S.r==='Admin'?'Admin Pokja':'Pokja';$('#av').textContent=S.u.slice(0,2).toUpperCase();
    load();
  }).catch(()=>{spin(0);toast('Tidak dapat terhubung ke server. Periksa GAS_URL di js/config.js',1)});
}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!$('#login').hidden)doLogin()});

function call(act,p){
  spin(1);
  return post({action:'api',token:S.t,act:act,p:p||{}}).then(r=>{spin(0);
    if(r.success)return r.data;
    toast(r.message,1);if(r.message==='Sesi berakhir')setTimeout(()=>location.reload(),1200);throw r.message;
  }).catch(e=>{spin(0);if(typeof e!=='string')toast('Gagal terhubung ke server',1);throw e});
}
async function load(){S.d=await call('muat');go(S.v)}
function go(v){S.v=v;if(v!=='akun')S.akun=null;
  $('#nav').innerHTML=NAV.filter(n=>n[0]!=='akun'||isA()).map(n=>{const k=n[0]==='eval'?S.d.Evaluasi.filter(e=>e.hasil==='KLR').length:0;return `<a class="${n[0]===v?'on':''}" onclick="go('${n[0]}')"><span>${n[2]}</span>${n[1]}${k?`<em>${k}</em>`:''}</a>`}).join('');
  $('#v').innerHTML=({dash,paket,eval:evalV,rekap,klar,akun})[v]();window.scrollTo(0,0)}
function upd(a,r){const i=a.findIndex(x=>x.id===r.id);i>=0?a[i]=r:a.push(r)}

/* ===== Turunan data ===== */
const ind=t=>S.d.Master_Indikator.filter(i=>+i.tahap===t);
const ev=(ps,i)=>S.d.Evaluasi.find(e=>e.id_peserta===ps&&e.id_indikator===i);
function st(ps,t){const I=ind(t);let f=0,b=0,k=0;
  I.forEach(i=>{const e=ev(ps,i);if(e&&e.hasil){f++;if(e.hasil==='TMS')b++;if(e.hasil==='KLR')k++}});
  return b?'bad':k?'warn':f&&f===I.length?'ok':f?'part':'none'}
function posisi(ps){for(let t=0;t<7;t++){const s=st(ps.id,t);if(s==='bad')return{t,s:'bad',x:'Gugur - Tahap '+t};if(s!=='ok')return{t,s,x:'Tahap '+t+' - '+TH[t][0]}}return{t:6,s:'ok',x:'Selesai'}}
const pes=pk=>S.d.Peserta.filter(p=>p.id_paket===pk);
const rasio=(p,pk)=>(+p.terkoreksi||+p.penawaran)/(+pk.hps)*100;
const badge=(c,x)=>`<span class="badge ${c}">${x}</span>`;

/* ===== Dashboard ===== */
const jt=n=>(n/1e9).toFixed(2).replace('.',',')+' M';
const ini=s=>String(s).replace(/^(PT|CV)\.?\s+/i,'').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
function gcari(v){if(S.v!=='paket')go('paket');const q=$('#q');if(q){q.value=v;cari(v)}}
function dash(){
  const P=S.d.Paket,E=S.d.Peserta;let hps=0,low=0,hpsB=0,sr=0,nr=0;
  const pk=P.map(k=>{const ps=pes(k.id).slice().sort((a,b)=>a.terkoreksi-b.terkoreksi);hps+=+k.hps;
    if(ps[0]){low+=+ps[0].terkoreksi;hpsB+=+k.hps}ps.forEach(p=>{sr+=rasio(p,k);nr++});return{k,ps}});
  const efis=hpsB-low,rows=pk.map(({k,ps})=>{const po=ps.length?ps.map(posisi).sort((a,b)=>a.t-b.t)[0]:null;
    return `<tr><td class="mono ac">${esc(k.kode)}</td><td><b>${esc(k.nama)}</b><div class="mu">${esc(k.satker)}</div></td><td class="num mono">Rp ${jt(k.hps)}</td><td class="num">${ps.length} Rekanan</td><td class="num">${po?badge(po.s,esc(po.x)):badge('none','Belum ada peserta')}</td></tr>`}).join('');
  const f=pk.find(x=>x.ps.length)||{ps:[]},fk=f.k;
  const top=f.ps.slice(0,3).map(p=>{const r=rasio(p,fk);return `<div class="pr"><span class="av">${esc(ini(p.nama))}</span><div><b>${esc(p.nama)}</b><div class="mono ac">${rp(p.terkoreksi)}</div><div class="mu">${r.toFixed(2)}% HPS · ${r>100?'Melebihi HPS':r<80?'Perlu uji kewajaran':'Memenuhi batas'}</div></div></div>`}).join('');
  const bars=f.ps.map(p=>{const r=rasio(p,fk);return `<div class="bar" title="${esc(p.nama)}" style="height:${Math.min(r,120)/1.2}%;background:${r>100?'#fb7185':r<80?'#fbbf24':'#19e6a6'}"><span>${r.toFixed(0)}%</span></div>`}).join('');
  const lo=[],gu=[];TH.forEach((t,i)=>{let l=0,g=0;E.forEach(p=>{const s=st(p.id,i);if(s==='ok')l++;if(s==='bad')g++});lo.push(l);gu.push(g)});
  const mx=Math.max(1,...lo,...gu),X=i=>40+i*86.7,Y=c=>170-c/mx*140,pl=a=>a.map((c,i)=>X(i)+','+Y(c)).join(' ');
  const svg=`<svg viewBox="0 0 600 180" class="svg"><defs><linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#19e6a6" stop-opacity=".35"/><stop offset="1" stop-color="#19e6a6" stop-opacity="0"/></linearGradient></defs>
  <polygon points="${X(0)},170 ${pl(lo)} ${X(6)},170" fill="url(#gl)"/><polyline points="${pl(lo)}" fill="none" stroke="#19e6a6" stroke-width="3"/><polyline points="${pl(gu)}" fill="none" stroke="#fb7185" stroke-width="3"/>
  ${lo.map((c,i)=>`<circle cx="${X(i)}" cy="${Y(c)}" r="4" fill="#19e6a6"><title>Tahap ${i}: lolos ${c}, gugur ${gu[i]}</title></circle>`).join('')}</svg>`;
  const sum=a=>a.reduce((x,y)=>x+y,0),it=[];
  P.forEach(k=>pes(k.id).forEach(p=>{const r=rasio(p,k);
    if(r>100)it.push(['#fb7185','Melebihi HPS',p.nama+' ('+r.toFixed(1)+'% HPS)','Gugur']);
    else if(r<80)it.push(['#fbbf24','Kewajaran harga &lt; 80% HPS',p.nama+' ('+r.toFixed(1)+'% HPS)','Uji']);}));
  S.d.Klarifikasi.slice(-3).forEach(c=>{const p=E.find(x=>x.id===c.id_peserta);it.push(['#38bdf8','Klarifikasi Tahap '+c.tahap,(p?p.nama:'-')+': '+c.hal,c.tanggal])});
  const tl=it.slice(0,7).map(x=>`<div class="tli"><i style="background:${x[0]}"></i><div><b>${x[1]}</b><span>${esc(x[2])}</span></div></div>`).join('')||'<p class="mu">Belum ada temuan.</p>';
  return `<div class="grid g2"><div class="card"><div class="top"><h3>Status Evaluasi &amp; HPS Paket</h3>${badge('ok','Sedang Berjalan')}</div>
  <div class="stats"><div><small>Total HPS Terinput</small><b>${rp(hps)}</b><small>${P.length} paket pekerjaan aktif</small></div>
  <div><small>Terkoreksi Terendah</small><b class="ac">${rp(low)}</b><small>Rata-rata ${nr?(sr/nr).toFixed(1):0}% HPS</small></div>
  <div><small>Potensi Efisiensi Kas</small><b class="am">${rp(efis)}</b><small>Hemat ${hpsB?(efis/hpsB*100).toFixed(2):0}% anggaran</small></div></div>
  <div class="scroll"><table><tr><th>Kode</th><th>Nama pekerjaan</th><th class="num">Nilai HPS</th><th class="num">Peserta</th><th class="num">Tahap / Status</th></tr>${rows||'<tr><td colspan="5" class="mu">Belum ada paket</td></tr>'}</table></div></div>
  <div class="card"><h3>Sebaran Penawaran Terkoreksi</h3><p class="mu">${fk?'Peringkat terendah: '+esc(fk.nama):'Belum ada data'}</p>${top}
  <div class="chart"><div class="l" style="bottom:${80/1.2}%"></div><div class="l l2" style="bottom:${100/1.2}%"></div>${bars}</div>
  <p class="mu">Garis hijau = ambang 80% HPS, garis merah = 100% HPS.</p></div></div>
  <div class="grid g2 mt"><div class="card"><div class="top"><div><h3>Progresi Kelulusan Tahapan 0 - 6</h3><p class="mu">Peserta memenuhi syarat vs gugur pada tiap tahap</p></div>
  <div class="lg"><span><i class="dot" style="background:#19e6a6"></i>Lolos MS: ${sum(lo)}</span><span><i class="dot" style="background:#fb7185"></i>Gugur TMS: ${sum(gu)}</span></div></div>${svg}
  <div class="xl">${TH.map((t,i)=>`<span style="color:${t[1]}">T-${i}</span>`).join('')}</div></div>
  <div class="card"><h3>Anomali &amp; Klarifikasi Terbaru</h3><p class="mu">Temuan otomatis dari data penawaran dan evaluasi</p>${tl}</div></div>`;
}

/* ===== Paket & Peserta ===== */
function paket(){
  const rows=S.d.Paket.map(k=>{const ps=pes(k.id),cur=ps.length?ps.map(posisi).sort((a,b)=>a.t-b.t)[0].x:'Belum ada peserta';
    return `<tr class="${S.pk===k.id?'sel':''}"><td><b>${esc(k.nama)}</b><br><span class="mu">${esc(k.kode)} · ${esc(k.satker)} · TA ${esc(k.tahun)} · ${esc(k.kualifikasi)}</span></td>
    <td class="num">${rp(k.hps)}</td><td class="num">${ps.length}</td><td>${esc(cur)}</td>
    <td class="noprint"><button class="btn s l" onclick="S.pk='${k.id}';go('paket')">Peserta</button>
    ${isA()?`<button class="btn s l" onclick="fPaket('${k.id}')">Ubah</button><button class="btn s r" onclick="hapus('Paket','${k.id}')">Hapus</button>`:''}</td></tr>`}).join('');
  const k=S.d.Paket.find(x=>x.id===S.pk);
  const det=k?`<div class="card" style="margin-top:16px"><div class="top"><h3>Peserta: ${esc(k.nama)}</h3><button class="btn s" onclick="fPes('${k.id}')">+ Peserta</button></div>
  <div class="scroll"><table><tr><th>Peserta</th><th class="num">Penawaran</th><th class="num">Terkoreksi</th><th class="num">% HPS</th><th>Status</th><th></th></tr>
  ${pes(k.id).sort((a,b)=>a.terkoreksi-b.terkoreksi).map(p=>{const r=rasio(p,k),po=posisi(p);
   return `<tr><td>${esc(p.nama)}</td><td class="num">${rp(p.penawaran)}</td><td class="num">${rp(p.terkoreksi)}</td>
   <td class="num">${r.toFixed(1)}% ${r>100?badge('bad','&gt; HPS'):r<80?badge('warn','&lt; 80%'):''}</td><td>${badge(po.s,esc(po.x))}</td>
   <td class="noprint"><button class="btn s l" onclick="S.pk='${k.id}';S.ps='${p.id}';go('eval')">Evaluasi</button>
   ${isA()?`<button class="btn s l" onclick="fPes('${k.id}','${p.id}')">Ubah</button><button class="btn s r" onclick="hapus('Peserta','${p.id}')">Hapus</button>`:''}</td></tr>`}).join('')||'<tr><td colspan="6" class="mu">Belum ada peserta</td></tr>'}</table></div></div>`:'';
  return `<div class="top"><h1>Daftar Paket Tender</h1><button class="btn" onclick="fPaket()">+ Tambah Paket</button></div>
  <input id="q" class="noprint" placeholder="Cari kode tender / nama paket / peserta..." oninput="cari(this.value)" style="margin-bottom:12px">
  <div class="card scroll"><table id="tb"><tr><th>Paket</th><th class="num">HPS</th><th class="num">Peserta</th><th>Tahapan saat ini</th><th></th></tr>${rows||'<tr><td colspan="5" class="mu">Belum ada paket</td></tr>'}</table></div>${det}`;
}
function cari(q){q=q.toLowerCase();document.querySelectorAll('#tb tr:not(:first-child)').forEach(r=>r.style.display=r.textContent.toLowerCase().includes(q)?'':'none')}

/* ===== Modal form ===== */
function modal(t,f,v,fn){
  v=v||{};$('#mbox').innerHTML=`<h3>${t}</h3>`+f.map(x=>`<label>${x[1]}</label>`+(x[2]==='sel'
    ?`<select id="f_${x[0]}">${x[3].map(o=>`<option ${v[x[0]]===o?'selected':''}>${o}</option>`).join('')}</select>`
    :`<input id="f_${x[0]}" type="${x[2]||'text'}" value="${esc(v[x[0]])}">`)).join('')
    +`<div style="display:flex;gap:8px;margin-top:16px"><button class="btn" id="msv">Simpan</button><button class="btn l" onclick="$('#modal').hidden=true">Batal</button></div>`;
  $('#modal').hidden=false;
  $('#msv').onclick=async()=>{const r={id:v.id};f.forEach(x=>r[x[0]]=$('#f_'+x[0]).value.trim());
    if(f.some(x=>x[4]&&!r[x[0]]))return toast('Lengkapi kolom wajib',1);
    try{await fn(r);$('#modal').hidden=true}catch(e){}};
}
function fPaket(id){const v=S.d.Paket.find(x=>x.id===id);
  modal(id?'Ubah Paket':'Tambah Paket Tender',[['nama','Nama paket','text','',1],['kode','Kode tender','text','',1],['hps','Nilai HPS (Rp)','number','',1],['satker','Nama satuan kerja'],['tahun','Tahun anggaran','number'],['kualifikasi','Kualifikasi usaha','sel',['Kecil','Menengah','Besar']]],v,
  async r=>{upd(S.d.Paket,await call('simpan',{sheet:'Paket',row:r}));go(S.v)})}
function fPes(pk,id){const v=S.d.Peserta.find(x=>x.id===id);
  modal(id?'Ubah Peserta':'Tambah Peserta',[['nama','Nama peserta','text','',1],['penawaran','Nilai penawaran (Rp)','number','',1],['terkoreksi','Penawaran terkoreksi (kosong = sama)','number']],v,
  async r=>{r.id_paket=pk;upd(S.d.Peserta,await call('simpan',{sheet:'Peserta',row:r}));S.pk=pk;go('paket')})}
async function hapus(sh,id){if(!confirm('Hapus data ini?'))return;await call('hapus',{sheet:sh,id});S.d[sh]=S.d[sh].filter(x=>x.id!==id);go(S.v)}

/* ===== Evaluasi (syarat vs tawaran) ===== */
function evalV(){
  const P=S.d.Paket;if(!S.pk&&P.length)S.pk=P[0].id;
  const ps=pes(S.pk);if(!ps.find(p=>p.id===S.ps))S.ps=ps.length?ps[0].id:'';
  const t=TH[S.th],I=ind(S.th),k=P.find(x=>x.id===S.pk),p=ps.find(x=>x.id===S.ps);
  const miss=p?I.filter(i=>{const e=ev(p.id,i.id);return !e||!e.hasil}).length:0;
  const tabs=TH.map((x,i)=>`<span class="tab ${i===S.th?'on':''}" style="--c:${x[1]};--b:${x[2]}" onclick="S.th=${i};go('eval')">${i}. ${x[0]}${p?' '+({ok:'✓',bad:'✕',warn:'!'}[st(p.id,i)]||''):''}</span>`).join('');
  const rows=p?I.map(i=>{const e=ev(p.id,i.id)||{},sy=S.d.Persyaratan.find(x=>x.id_paket===S.pk&&x.id_indikator===i.id);
    const dis='';
    return `<tr id="r_${i.id}" class="${e.hasil?'':'miss'}"><td>${esc(i.nama)} ${+i.gugur?badge('part','menggugurkan'):''}</td>
    <td><input class="s" value="${esc(sy?sy.syarat:'')}" ${dis} onchange="saveSy('${i.id}')" placeholder="isi syarat"></td>
    <td><input class="t" value="${esc(e.tawaran)}" ${dis} placeholder="yang ditawarkan"></td>
    <td><select class="h" ${dis} onchange="saveEv('${i.id}')"><option value="">- pilih -</option>${Object.keys(HS).map(h=>`<option value="${h}" ${e.hasil===h?'selected':''}>${HS[h]}</option>`).join('')}</select></td>
    <td><input class="c" value="${esc(e.catatan)}" ${dis} placeholder="catatan"></td></tr>`}).join(''):'';
  const bk=p?S.d.Berkas.filter(b=>b.id_peserta===p.id):[];
  return `<div class="top"><h1>Evaluasi Tahap 0-6</h1><button class="btn noprint" onclick="window.print()">Cetak Kertas Kerja (PDF)</button></div>
  <div class="grid g3 noprint"><div><label>Paket</label><select onchange="S.pk=this.value;S.ps='';go('eval')">${P.map(x=>`<option value="${x.id}" ${x.id===S.pk?'selected':''}>${esc(x.nama)}</option>`).join('')}</select></div>
  <div><label>Peserta</label><select onchange="S.ps=this.value;go('eval')">${ps.map(x=>`<option value="${x.id}" ${x.id===S.ps?'selected':''}>${esc(x.nama)}</option>`).join('')}</select></div></div>
  ${p?`<p class="mu" style="margin-top:10px">${esc(k.kode)} · ${esc(k.nama)} · ${esc(k.satker)} · HPS ${rp(k.hps)} · Peserta: <b>${esc(p.nama)}</b> · Penawaran terkoreksi ${rp(p.terkoreksi)} (${rasio(p,k).toFixed(1)}% HPS)</p>
  <div class="tabs">${tabs}</div>
  <div class="card scroll"><div class="top"><h3 style="color:${t[1]}">Tahap ${S.th} - ${t[0]}</h3>${miss?badge('bad',miss+' indikator belum terisi'):badge('ok','Tahap lengkap')}</div>
  <table><tr><th>Indikator</th><th>Disyaratkan</th><th>Ditawarkan</th><th>Hasil (wajib)</th><th>Catatan</th></tr>${rows}</table>
  <p class="mu noprint">Pilih Hasil untuk menyimpan baris; Tawaran dan Catatan ikut tersimpan.</p></div>
  <div class="card noprint" style="margin-top:16px"><h3>Berkas peserta</h3>
  ${bk.map(b=>`<div><a href="${esc(b.url)}" target="_blank">${esc(b.nama)}</a> <span class="mu">${esc(b.jenis)}</span></div>`).join('')||'<p class="mu">Belum ada berkas.</p>'}
  ${isA()?`<div class="grid g3"><select id="bj"><option>Dokumen Penawaran</option><option>Bukti Pendukung</option><option>Berita Acara Klarifikasi</option></select><input id="bf" type="file"><button class="btn" onclick="unggah()">Unggah</button></div>`:''}</div>`
  :'<div class="card">Pilih paket yang sudah memiliki peserta.</div>'}`;
}
async function saveSy(i){const r=$('#r_'+i);
  upd(S.d.Persyaratan,await call('simpan',{sheet:'Persyaratan',row:{id_paket:S.pk,id_indikator:i,syarat:r.querySelector('.s').value}}))}
async function saveEv(i){const r=$('#r_'+i),h=r.querySelector('.h').value;if(!h)return;
  upd(S.d.Evaluasi,await call('simpan',{sheet:'Evaluasi',row:{id_peserta:S.ps,id_indikator:i,tawaran:r.querySelector('.t').value,hasil:h,catatan:r.querySelector('.c').value}}));
  go('eval');toast('Tersimpan')}
function unggah(){const f=$('#bf').files[0];if(!f)return toast('Pilih berkas dulu',1);
  if(f.size>10e6)return toast('Maksimal 10 MB',1);
  const rd=new FileReader();rd.onload=async()=>{try{
    upd(S.d.Berkas,await call('unggah',{id_paket:S.pk,id_peserta:S.ps,jenis:$('#bj').value,nama:f.name,mime:f.type||'application/octet-stream',b64:rd.result.split(',')[1]}));go('eval');toast('Berkas terunggah')}catch(e){}};
  rd.readAsDataURL(f)}

/* ===== Rekap ===== */
function rekap(){
  const body=S.d.Paket.map(k=>`<div class="card" style="margin-bottom:16px"><h3>${esc(k.kode)} · ${esc(k.nama)}</h3><p class="mu">HPS ${rp(k.hps)} · ${esc(k.satker)} · TA ${esc(k.tahun)}</p>
  <div class="scroll"><table><tr><th>Peserta</th><th class="num">Terkoreksi</th><th class="num">% HPS</th>${TH.map((t,i)=>`<th style="color:${t[1]}">T${i}</th>`).join('')}</tr>
  ${pes(k.id).sort((a,b)=>a.terkoreksi-b.terkoreksi).map(p=>{const r=rasio(p,k);
   return `<tr><td>${esc(p.nama)}</td><td class="num">${rp(p.terkoreksi)}</td><td class="num">${r.toFixed(1)}%</td>
   ${TH.map((t,i)=>{const s=st(p.id,i);return `<td>${badge(s,{ok:'Lulus',bad:'Gugur',warn:'Klarif.',part:'Proses',none:'-'}[s])}</td>`}).join('')}</tr>`}).join('')||'<tr><td colspan="10" class="mu">Belum ada peserta</td></tr>'}</table></div></div>`).join('');
  return `<div class="top"><h1>Rekapitulasi Hasil Evaluasi</h1><button class="btn noprint" onclick="window.print()">Cetak PDF</button></div>${body||'<div class="card">Belum ada paket.</div>'}`;
}

/* ===== Kelola Akun (Admin) ===== */
function akun(){
  if(!isA())return '<div class="card">Halaman ini khusus Admin.</div>';
  if(S.akun)return akunH();
  call('akun_list').then(a=>{S.akun=a;if(S.v==='akun')$('#v').innerHTML=akunH()}).catch(()=>{});
  return '<div class="card">Memuat akun...</div>';
}
function akunH(){
  const rows=S.akun.map(a=>`<tr><td><b>${esc(a.nama)}</b></td><td>${badge(a.peran==='Admin'?'warn':'part',a.peran)}</td><td>${badge(a.aktif?'ok':'bad',a.aktif?'Aktif':'Nonaktif')}</td>
  <td><button class="btn s l" onclick="fAkun('${a.id}')">Ubah nama / peran</button>
  <button class="btn s l" onclick="fPin('${a.id}')">Ganti PIN</button>
  <button class="btn s ${a.aktif?'r':''}" onclick="togAkun('${a.id}')">${a.aktif?'Nonaktifkan':'Aktifkan'}</button></td></tr>`).join('');
  return `<div class="top"><h1>Kelola Akun</h1><button class="btn" onclick="fAkun()">+ Tambah Anggota</button></div>
  <div class="card scroll"><table><tr><th>Nama</th><th>Peran</th><th>Status</th><th></th></tr>${rows}</table>
  <p class="mu">PIN tidak dapat dilihat, hanya dapat diganti. Akun yang dinonaktifkan atau diubah nama/perannya harus login ulang.</p></div>`;
}
async function simpanAkun(a){await call('akun_simpan',a);S.akun=await call('akun_list');go('akun');toast('Akun tersimpan')}
function fAkun(id){
  const a=S.akun.find(x=>x.id===id),b=a||{};
  modal(a?'Ubah Nama / Peran':'Tambah Anggota',[['nama','Nama (dipakai untuk login)','text','',1],['peran','Peran','sel',['Pokja','Admin']]].concat(a?[]:[['pin','PIN (4-8 angka)','password','',1]]),b,
  r=>simpanAkun({id:a&&a.id,nama:r.nama,peran:r.peran,pin:r.pin||'',aktif:a?a.aktif:true}))}
function fPin(id){
  const a=S.akun.find(x=>x.id===id);
  modal('Ganti PIN: '+esc(a.nama),[['pin','PIN baru (4-8 angka)','password','',1]],{},
  r=>simpanAkun({id:a.id,nama:a.nama,peran:a.peran,pin:r.pin,aktif:a.aktif}))}
async function togAkun(id){
  const a=S.akun.find(x=>x.id===id);
  if(a.aktif&&!confirm('Nonaktifkan akun '+a.nama+'?'))return;
  try{await simpanAkun({id:a.id,nama:a.nama,peran:a.peran,pin:'',aktif:!a.aktif})}catch(e){}}

/* ===== Klarifikasi ===== */
function klar(){
  const rows=S.d.Klarifikasi.map(c=>{const p=S.d.Peserta.find(x=>x.id===c.id_peserta);
    return `<tr><td>${esc(c.tanggal)}</td><td>${esc(p?p.nama:'-')}</td><td>Tahap ${esc(c.tahap)}</td><td>${esc(c.hal)}</td><td>${esc(c.hasil)}</td>
    <td class="noprint">${isA()?`<button class="btn s r" onclick="hapus('Klarifikasi','${c.id}')">Hapus</button>`:''}</td></tr>`}).join('');
  return `<div class="top"><h1>Catatan Klarifikasi</h1><button class="btn" onclick="fKlar()">+ Klarifikasi</button></div>
  <div class="card scroll"><table><tr><th>Tanggal</th><th>Peserta</th><th>Tahap</th><th>Hal yang diklarifikasi</th><th>Hasil</th><th></th></tr>${rows||'<tr><td colspan="6" class="mu">Belum ada catatan</td></tr>'}</table></div>`;
}
function fKlar(){
  const ps=S.d.Peserta.map(p=>p.id+' | '+p.nama);
  modal('Tambah Klarifikasi',[['pes','Peserta','sel',ps],['tahap','Tahap (0-6)','sel',['0','1','2','3','4','5','6']],['tanggal','Tanggal','date','',1],['hal','Hal yang diklarifikasi','text','',1],['hasil','Hasil klarifikasi']],{},
  async r=>{r.id_peserta=r.pes.split(' | ')[0];delete r.pes;upd(S.d.Klarifikasi,await call('simpan',{sheet:'Klarifikasi',row:r}));go('klar')})}
