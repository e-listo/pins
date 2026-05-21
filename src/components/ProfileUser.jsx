"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { logout } from "../lib/auth";
import { Camera, Trash2 } from "lucide-react";

const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-50 bg-slate-50 hover:bg-white transition-colors";
const ROLE_LABEL = {
  superadmin:   { label:"Super Admin",     color:"bg-purple-100 text-purple-700" },
  admin_bidang: { label:"Admin Bidang",    color:"bg-blue-100 text-blue-700" },
  operator:     { label:"Operator Gudang", color:"bg-emerald-100 text-emerald-700" },
  viewer:       { label:"Viewer",          color:"bg-slate-100 text-slate-600" },
};
const AVATAR_SIZE = 256;
const AVATAR_QUALITY = 0.85;
const MAX_INPUT_MB = 10;

// ── CropModal ─────────────────────────────────────────────────────────────────
function CropModal({ imageSrc, onCancel, onConfirm }) {
  const canvasRef    = useRef(null);
  const previewRef   = useRef(null);
  const imgRef       = useRef(null);
  const isDragging   = useRef(false);
  const dragStart    = useRef({ x:0, y:0 });
  const [imgNat, setImgNat]     = useState({ w:0, h:0 });
  const [disp, setDisp]         = useState({ w:0, h:0 });
  const [crop, setCrop]         = useState({ x:0, y:0, r:80 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const maxW = 460, maxH = 320;
      const scale = Math.min(maxW/img.naturalWidth, maxH/img.naturalHeight, 1);
      const dw = Math.round(img.naturalWidth*scale);
      const dh = Math.round(img.naturalHeight*scale);
      setImgNat({ w:img.naturalWidth, h:img.naturalHeight });
      setDisp({ w:dw, h:dh });
      const r = Math.min(dw,dh)*0.4;
      setCrop({ x:dw/2, y:dh/2, r });
      imgRef.current = img;
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Draw overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas||!disp.w) return;
    canvas.width=disp.w; canvas.height=disp.h;
    const ctx=canvas.getContext("2d");
    ctx.clearRect(0,0,disp.w,disp.h);
    ctx.fillStyle="rgba(0,0,0,0.55)";
    ctx.fillRect(0,0,disp.w,disp.h);
    ctx.globalCompositeOperation="destination-out";
    ctx.beginPath(); ctx.arc(crop.x,crop.y,crop.r,0,Math.PI*2); ctx.fill();
    ctx.globalCompositeOperation="source-over";
    ctx.strokeStyle="rgba(255,255,255,0.9)"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(crop.x,crop.y,crop.r,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle="rgba(255,255,255,0.25)"; ctx.lineWidth=1;
    for (const o of [-crop.r/3,0,crop.r/3]) {
      ctx.beginPath(); ctx.moveTo(crop.x+o,crop.y-crop.r); ctx.lineTo(crop.x+o,crop.y+crop.r); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(crop.x-crop.r,crop.y+o); ctx.lineTo(crop.x+crop.r,crop.y+o); ctx.stroke();
    }
  }, [crop, disp]);

  // Draw preview
  useEffect(() => {
    const pc=previewRef.current;
    if (!pc||!imgRef.current||!disp.w) return;
    pc.width=pc.height=80;
    const ctx=pc.getContext("2d");
    const sx=(crop.x-crop.r)*(imgNat.w/disp.w);
    const sy=(crop.y-crop.r)*(imgNat.h/disp.h);
    const sw=crop.r*2*(imgNat.w/disp.w);
    const sh=crop.r*2*(imgNat.h/disp.h);
    ctx.clearRect(0,0,80,80);
    ctx.save(); ctx.beginPath(); ctx.arc(40,40,40,0,Math.PI*2); ctx.clip();
    ctx.drawImage(imgRef.current,sx,sy,sw,sh,0,0,80,80);
    ctx.restore();
  }, [crop, disp, imgNat]);

  const onPD = useCallback((e) => {
    const rect=canvasRef.current.getBoundingClientRect();
    const cx=(e.clientX||e.touches[0].clientX)-rect.left;
    const cy=(e.clientY||e.touches[0].clientY)-rect.top;
    if (Math.hypot(cx-crop.x,cy-crop.y)<crop.r) {
      isDragging.current=true;
      dragStart.current={x:cx-crop.x,y:cy-crop.y};
    }
    e.preventDefault();
  }, [crop]);

  const onPM = useCallback((e) => {
    if (!isDragging.current) return;
    const rect=canvasRef.current.getBoundingClientRect();
    const cx=(e.clientX||e.touches[0].clientX)-rect.left;
    const cy=(e.clientY||e.touches[0].clientY)-rect.top;
    const nx=cx-dragStart.current.x, ny=cy-dragStart.current.y;
    setCrop(p=>({...p,x:Math.max(p.r,Math.min(disp.w-p.r,nx)),y:Math.max(p.r,Math.min(disp.h-p.r,ny))}));
    e.preventDefault();
  }, [disp]);

  const onPU = useCallback(() => { isDragging.current=false; }, []);

  const setR = (r) => setCrop(p=>({
    x:Math.max(r,Math.min(disp.w-r,p.x)),
    y:Math.max(r,Math.min(disp.h-r,p.y)),
    r
  }));

  const confirm = useCallback(() => {
    if (!imgRef.current||!disp.w) return;
    const out=document.createElement("canvas");
    out.width=out.height=AVATAR_SIZE;
    const ctx=out.getContext("2d");
    ctx.beginPath(); ctx.arc(AVATAR_SIZE/2,AVATAR_SIZE/2,AVATAR_SIZE/2,0,Math.PI*2); ctx.clip();
    const sx=(crop.x-crop.r)*(imgNat.w/disp.w);
    const sy=(crop.y-crop.r)*(imgNat.h/disp.h);
    const sw=crop.r*2*(imgNat.w/disp.w);
    const sh=crop.r*2*(imgNat.h/disp.h);
    ctx.drawImage(imgRef.current,sx,sy,sw,sh,0,0,AVATAR_SIZE,AVATAR_SIZE);
    out.toBlob(blob=>onConfirm(blob),"image/webp",AVATAR_QUALITY);
  }, [crop, disp, imgNat, onConfirm]);

  const maxR = disp.w ? Math.floor(Math.min(crop.x,crop.y,disp.w-crop.x,disp.h-crop.y,Math.min(disp.w,disp.h)*0.49)) : 80;

  if (!disp.w) return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{background:"rgba(0,0,0,0.7)"}}>
      <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.75)",backdropFilter:"blur(4px)"}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" style={{animation:"modalIn .18s ease"}}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Crop Foto Profil</h3>
            <p className="text-xs text-slate-400 mt-0.5">Geser lingkaran · Slider untuk ubah ukuran · Output {AVATAR_SIZE}×{AVATAR_SIZE}px WebP</p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">✕</button>
        </div>

        {/* Crop canvas area */}
        <div className="bg-slate-900 flex items-center justify-center overflow-hidden" style={{height:disp.h+24,position:"relative"}}>
          <img src={imageSrc} alt="" style={{width:disp.w,height:disp.h,display:"block",userSelect:"none",pointerEvents:"none"}} draggable={false}/>
          <canvas ref={canvasRef} style={{position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",cursor:"move",touchAction:"none"}}
            onMouseDown={onPD} onMouseMove={onPM} onMouseUp={onPU} onMouseLeave={onPU}
            onTouchStart={onPD} onTouchMove={onPM} onTouchEnd={onPU}/>
        </div>

        <div className="px-5 py-3 border-t border-slate-50 space-y-3">
          {/* Radius slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-16 flex-shrink-0">Ukuran crop</span>
            <button onClick={()=>setR(Math.max(30,crop.r-10))} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center flex-shrink-0">−</button>
            <input type="range" min={30} max={maxR} value={Math.round(crop.r)}
              onChange={e=>setR(parseInt(e.target.value))}
              className="flex-1 accent-blue-600" style={{height:4}}/>
            <button onClick={()=>setR(Math.min(maxR,crop.r+10))} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center flex-shrink-0">+</button>
          </div>

          {/* Preview + info */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 text-center">
              <p className="text-xs text-slate-400 mb-1.5">Preview</p>
              <canvas ref={previewRef} width={72} height={72} style={{borderRadius:"50%",border:"2px solid #e2e8f0",display:"block"}}/>
            </div>
            <div className="flex-1 bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-1">
              <p>📐 Output: <strong>{AVATAR_SIZE}×{AVATAR_SIZE}px</strong> persegi</p>
              <p>🗜️ Format: <strong>WebP</strong> · Kualitas {Math.round(AVATAR_QUALITY*100)}%</p>
              <p>📏 Semua ukuran input diterima (maks {MAX_INPUT_MB}MB)</p>
              <p>✂️ Area crop: <strong>{Math.round(crop.r*2*(imgNat.w/(disp.w||1)))}×{Math.round(crop.r*2*(imgNat.h/(disp.h||1)))}</strong>px</p>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Batal</button>
            <button onClick={confirm} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">✓ Terapkan Foto</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ProfileUser ──────────────────────────────────────────────────────────
export default function ProfileUser({ onClose }) {
  const [pegawai, setPegawai]     = useState(null);
  const [gudangList, setGudangList] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState("profil");
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [cropSrc, setCropSrc]     = useState(null);
  const fileInputRef = useRef(null);
  const [pwForm, setPwForm]       = useState({ baru:"", konfirmasi:"" });
  const [showPw, setShowPw]       = useState(false);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    try {
      const { data:{ user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data:p } = await supabase.from("pegawai")
        .select('*').eq("auth_id",user.id).single();
      setPegawai({...p, email:user.email, last_sign_in:user.last_sign_in_at});
      if (p?.foto_url) setAvatarPreview(p.foto_url+"?t="+Date.now());
      if (p?.role==="operator") {
        const {data:og} = await supabase.from("operator_gudang")
          .select("*, gudang:gudang_id(nama,kode_lokasi,alamat)").eq("pegawai_id",p.id);
        setGudangList(og?.map(x=>x.gudang)||[]);
      }
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  }

  function handleFileSelect(e) {
    const file=e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("File harus berupa gambar (JPG, PNG, WebP, dll)"); return; }
    if (file.size>MAX_INPUT_MB*1024*1024) { setError(`File terlalu besar (maks ${MAX_INPUT_MB}MB)`); return; }
    setError("");
    const reader=new FileReader();
    reader.onload=ev=>setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value="";
  }

  async function handleCropConfirm(blob) {
    setCropSrc(null);
    const sizeMB=(blob.size/1024/1024).toFixed(2);
    setUploading(true); setError("");
    setAvatarPreview(URL.createObjectURL(blob));
    try {
      const path=`${pegawai.id}/avatar.webp`;
      const {error:upErr}=await supabase.storage.from("avatars")
        .upload(path,blob,{upsert:true,contentType:"image/webp"});
      if (upErr) throw upErr;
      const {data:{publicUrl}}=supabase.storage.from("avatars").getPublicUrl(path);
      const {error:dbErr}=await supabase.from("pegawai")
        .update({foto_url:publicUrl}).eq("id",pegawai.id);
      if (dbErr) throw dbErr;
      setAvatarPreview(publicUrl+"?t="+Date.now());
      setPegawai(p=>({...p,foto_url:publicUrl}));
      setSuccess(`✅ Foto diupload (${sizeMB}MB → ${AVATAR_SIZE}×${AVATAR_SIZE}px WebP)`);
    } catch(e) {
      setError(e.message||"Gagal upload foto");
      setAvatarPreview(pegawai?.foto_url||null);
    } finally { setUploading(false); }
  }

  async function handleRemoveAvatar() {
    if (!pegawai?.foto_url) return;
    setUploading(true);
    try {
      await supabase.storage.from("avatars").remove([`${pegawai.id}/avatar.webp`]);
      await supabase.rpc('update_my_foto', { p_id: pegawai.id, p_foto_url: null });
      setAvatarPreview(null);
      setPegawai(p=>({...p,foto_url:null}));
      setSuccess("✅ Foto profil dihapus");
    } catch(e){ setError("Gagal menghapus foto"); }
    finally { setUploading(false); }
  }

  async function handleChangePassword() {
    if (!pwForm.baru||pwForm.baru.length<8){ setError("Password baru minimal 8 karakter"); return; }
    if (pwForm.baru!==pwForm.konfirmasi){ setError("Konfirmasi password tidak cocok"); return; }
    setSaving(true); setError("");
    try {
      const {error:e}=await supabase.auth.updateUser({password:pwForm.baru});
      if (e) throw e;
      setSuccess("✅ Password berhasil diubah!");
      setPwForm({baru:"",konfirmasi:""});
    } catch(e){ setError(e.message||"Gagal mengubah password"); }
    finally { setSaving(false); }
  }

  const role=ROLE_LABEL[pegawai?.role]||ROLE_LABEL.viewer;
  const inisial=pegawai?.nama?.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()||"?";
  const pwStr=p=>!p?0:p.length<8?1:/[A-Z]/.test(p)&&/[0-9]/.test(p)&&/[^A-Za-z0-9]/.test(p)?3:2;
  const pwC=["","bg-red-400","bg-amber-400","bg-emerald-400"];
  const pwL=["","Lemah","Cukup","Kuat"];
  const pwT=["","text-red-500","text-amber-500","text-emerald-600"];

  return (
    <>
      {cropSrc && <CropModal imageSrc={cropSrc} onCancel={()=>setCropSrc(null)} onConfirm={handleCropConfirm}/>}

      <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-16" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
          style={{animation:"slideDown .18s ease"}} onClick={e=>e.stopPropagation()}>

          {/* Header */}
          <div className="px-5 pt-5 pb-4 flex-shrink-0" style={{background:"linear-gradient(135deg,#1e3a5f,#1e40af)"}}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Profil Pengguna</p>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-white/70">✕</button>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0 group">
                <div className="w-16 h-16 rounded-full border-2 border-white/40 overflow-hidden bg-white/20 flex items-center justify-center relative">
                  {uploading
                    ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                    : avatarPreview
                      ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover"/>
                      : <span className="text-xl font-black text-white">{loading?"…":inisial}</span>
                  }
                </div>
                {!uploading && (
                  avatarPreview ? (
                    <div className="absolute inset-0 rounded-full flex items-center justify-center gap-1.5 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e)=>{e.stopPropagation(); fileInputRef.current?.click();}} className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors" title="Ganti Foto">
                        <Camera size={14} />
                      </button>
                      <button onClick={(e)=>{e.stopPropagation(); handleRemoveAvatar();}} className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors" title="Hapus Foto">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={(e)=>{e.stopPropagation(); fileInputRef.current?.click();}} className="absolute inset-0 rounded-full flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity" title="Upload Foto">
                      <Camera size={20} className="text-white" />
                    </button>
                  )
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-base leading-tight truncate">{loading?"Memuat...":pegawai?.nama}</p>
                <p className="text-white/60 text-xs font-mono mt-0.5">NIP: {pegawai?.nip}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${role.color}`}>{role.label}</span>
                </div>
              </div>
            </div>
          </div>

          {(success||error)&&(
            <div className={`px-4 py-2.5 text-xs font-semibold flex justify-between items-center flex-shrink-0 ${success?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-600"}`}>
              <span>{success||error}</span>
              <button onClick={()=>{setSuccess("");setError("");}}>✕</button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-slate-100 flex-shrink-0">
            {[{key:"profil",label:"Profil"},{key:"password",label:"Ubah Password"},{key:"akses",label:pegawai?.role==="operator"?"Akses Gudang":"Info Akses"}].map(t=>(
              <button key={t.key} onClick={()=>{setTab(t.key);setError("");setSuccess("");}}
                className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${tab===t.key?"text-blue-600 border-blue-600":"text-slate-500 border-transparent hover:text-slate-700"}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab==="profil"&&(
              <div className="p-5 space-y-3">
                {loading?<div className="py-8 text-center text-slate-400 text-sm">Memuat profil...</div>:(<>
                  <div className="bg-slate-50 rounded-2xl p-4">
                    {[["Nama Lengkap",pegawai?.nama],["NIP",pegawai?.nip],["Jabatan",pegawai?.jabatan||"-"],["Role",role.label],["Bidang",pegawai?.bidang?.nama||"-"],["Email Sistem",pegawai?.email]].map(([k,v])=>(
                      <div key={k} className="flex justify-between items-start gap-4 py-2.5 border-b border-slate-100 last:border-0">
                        <span className="text-xs text-slate-500 flex-shrink-0">{k}</span>
                        <span className="text-xs font-semibold text-slate-800 text-right break-all max-w-52">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-blue-700">Login Terakhir</p>
                      <p className="text-xs text-blue-600 mt-0.5">{pegawai?.last_sign_in?new Date(pegawai.last_sign_in).toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}):"-"}</p>
                    </div>
                  </div>

                  {/* --- TOMBOL RAHASIA UNTUK SUPERADMIN --- */}
                  {String(pegawai?.role).toLowerCase().includes("super") && (
                    <a href="/migrasi" onClick={(e) => e.stopPropagation()} className="w-full flex items-center justify-center gap-2 py-3 mt-1 mb-1 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-sm font-bold hover:bg-purple-100 transition-colors shadow-sm">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      System Tools: Migrasi Data
                    </a>
                  )}

                  <button onClick={async()=>{await logout();window.location.href="/login";}}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
                    Keluar dari Sistem
                  </button>
                </>)}
              </div>
            )}

            {tab==="password"&&(
              <div className="p-5">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">💡 Gunakan kombinasi huruf besar, angka, dan simbol untuk keamanan optimal.</div>
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Password Baru *</label>
                  <div className="relative">
                    <input type={showPw?"text":"password"} className={inputCls} placeholder="Min. 8 karakter" value={pwForm.baru} onChange={e=>setPwForm({...pwForm,baru:e.target.value})}/>
                    <button type="button" onClick={()=>setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600">{showPw?"Sembunyikan":"Tampilkan"}</button>
                  </div>
                  {pwForm.baru&&(<div className="mt-1.5"><div className="flex gap-1 mb-1">{[1,2,3].map(i=><div key={i} className={`h-1 flex-1 rounded-full ${i<=pwStr(pwForm.baru)?pwC[pwStr(pwForm.baru)]:"bg-slate-200"}`}/>)}</div><p className={`text-xs font-semibold ${pwT[pwStr(pwForm.baru)]}`}>{pwL[pwStr(pwForm.baru)]}</p></div>)}
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Konfirmasi Password Baru *</label>
                  <input type={showPw?"text":"password"} className={`${inputCls} ${pwForm.konfirmasi&&pwForm.konfirmasi!==pwForm.baru?"border-red-300 ring-1 ring-red-300":pwForm.konfirmasi&&pwForm.konfirmasi===pwForm.baru?"border-emerald-300 ring-1 ring-emerald-300":""}`} placeholder="Ulangi password baru" value={pwForm.konfirmasi} onChange={e=>setPwForm({...pwForm,konfirmasi:e.target.value})}/>
                  {pwForm.konfirmasi&&<p className={`text-xs font-semibold mt-1 ${pwForm.konfirmasi===pwForm.baru?"text-emerald-600":"text-red-500"}`}>{pwForm.konfirmasi===pwForm.baru?"✅ Password cocok":"❌ Password tidak cocok"}</p>}
                </div>
                <button onClick={handleChangePassword} disabled={saving||!pwForm.baru||pwForm.baru!==pwForm.konfirmasi} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">{saving?"Menyimpan...":"Ubah Password"}</button>
              </div>
            )}

            {tab==="akses"&&(
              <div className="p-5 space-y-3">
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Hak Akses: <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${role.color}`}>{role.label}</span></p>
                  {[["Dashboard",true],["Lihat Data Barang",true],["Tambah/Edit Barang",["superadmin","admin_bidang","operator"].includes(pegawai?.role)],["Input Transaksi",["superadmin","admin_bidang","operator"].includes(pegawai?.role)],["Export Laporan",true],["Manajemen Gudang",["superadmin","admin_bidang"].includes(pegawai?.role)],["Manajemen User",["superadmin"].includes(pegawai?.role)],["Hapus Data",["superadmin"].includes(pegawai?.role)]].map(([f,b])=>(
                    <div key={f} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <span className="text-sm text-slate-700">{f}</span>
                      <span className={`text-xs font-semibold ${b?"text-emerald-600":"text-slate-400"}`}>{b?"✅ Diizinkan":"🚫 Tidak Diizinkan"}</span>
                    </div>
                  ))}
                </div>
                {pegawai?.role==="operator"&&(
                  <div className="bg-blue-50 rounded-2xl p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Gudang yang Dapat Diakses</p>
                    {gudangList.length===0?<p className="text-sm text-slate-400">Belum ada gudang yang di-assign.</p>:gudangList.map(g=>(
                      <div key={g.kode_lokasi} className="flex items-center gap-3 py-2 border-b border-blue-100 last:border-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M3 9V7a2 2 0 012-2h14a2 2 0 012 2v2"/></svg>
                        </div>
                        <div><p className="text-sm font-semibold text-slate-800">{g.nama}</p><p className="text-xs text-slate-400 font-mono">{g.kode_lokasi}</p></div>
                      </div>
                    ))}
                  </div>
                )}
                {pegawai?.role==="admin_bidang"&&pegawai?.bidang&&(
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bidang yang Dikelola</p>
                    <p className="font-bold text-slate-800">{pegawai.bidang.nama}</p>
                    <p className="text-xs font-mono text-blue-600 mt-0.5">{pegawai.bidang.kode}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
