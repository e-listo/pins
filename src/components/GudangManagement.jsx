"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 hover:bg-white transition-colors";

function Field({ label, children }) {
  return <div className="mb-3"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>{children}</div>;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(15,23,42,0.55)", backdropFilter:"blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-screen overflow-y-auto" style={{ animation:"modalIn .18s ease" }}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function GudangManagement() {
  const [gudang, setGudang]       = useState([]);
  const [barangList, setBarangList] = useState([]);
  const [operatorList, setOperatorList] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [selected, setSelected]   = useState(null);
  const [activeTab, setActiveTab] = useState("barang");

  // Modals
  const [showAdd, setShowAdd]     = useState(false);
  const [showEdit, setShowEdit]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const [form, setForm] = useState({ nama: "", alamat: "", kode_lokasi: "" });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [{ data: g }, { data: b }] = await Promise.all([
        supabase.from("gudang").select("*").order("nama"),
        supabase.from("barang").select("*, gudang:gudang_id(id, nama)"),
      ]);
      setGudang(g || []);
      setBarangList(b || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function loadOperators(gudangId) {
    const { data } = await supabase
      .from("operator_gudang")
      .select("*, pegawai:pegawai_id(nip, nama, jabatan, role)")
      .eq("gudang_id", gudangId);
    setOperatorList(data || []);
  }

  function notify(msg, isError = false) {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  }

  async function handleAdd() {
    if (!form.nama || !form.kode_lokasi) { setError("Nama dan Kode Lokasi wajib diisi"); return; }
    setSaving(true); setError("");
    try {
      const { error: e } = await supabase.from("gudang").insert({
        nama: form.nama, alamat: form.alamat, kode_lokasi: form.kode_lokasi.toUpperCase()
      });
      if (e) throw e;
      notify(`✅ Gudang "${form.nama}" berhasil ditambahkan`);
      setShowAdd(false);
      setForm({ nama: "", alamat: "", kode_lokasi: "" });
      loadAll();
    } catch (e) { setError(e.message || "Gagal menambahkan gudang"); }
    finally { setSaving(false); }
  }

  async function handleEdit() {
    if (!selected || !form.nama) { setError("Nama gudang wajib diisi"); return; }
    setSaving(true); setError("");
    try {
      const { error: e } = await supabase.from("gudang").update({
        nama: form.nama, alamat: form.alamat, kode_lokasi: form.kode_lokasi.toUpperCase()
      }).eq("id", selected.id);
      if (e) throw e;
      notify(`✅ Gudang "${form.nama}" berhasil diupdate`);
      setShowEdit(false);
      loadAll();
    } catch (e) { setError(e.message || "Gagal update gudang"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!selected) return;
    const hasBarang = barangList.filter(b => b.gudang_id === selected.id).length > 0;
    if (hasBarang) { setError(`Tidak bisa hapus — gudang masih memiliki ${barangList.filter(b => b.gudang_id === selected.id).length} barang`); setShowDelete(false); return; }
    setSaving(true); setError("");
    try {
      const { error: e } = await supabase.from("gudang").delete().eq("id", selected.id);
      if (e) throw e;
      notify(`✅ Gudang "${selected.nama}" berhasil dihapus`);
      setShowDelete(false);
      setSelected(null);
      loadAll();
    } catch (e) { setError(e.message || "Gagal menghapus gudang"); }
    finally { setSaving(false); }
  }

  function openEdit(g) {
    setSelected(g);
    setForm({ nama: g.nama, alamat: g.alamat || "", kode_lokasi: g.kode_lokasi || "" });
    setError("");
    setShowEdit(true);
  }

  function openDelete(g) {
    setSelected(g);
    setError("");
    setShowDelete(true);
  }

  async function openDetail(g) {
    setSelected(g);
    setActiveTab("barang");
    await loadOperators(g.id);
    setShowDetail(true);
  }

  const getBarangGudang = (gid) => barangList.filter(b => b.gudang_id === gid);
  const getTotalNilai = (gid) => barangList.filter(b => b.gudang_id === gid).reduce((a, b) => a + b.stok * b.harga_satuan, 0);
  const getAlertCount = (gid) => barangList.filter(b => b.gudang_id === gid && b.stok <= b.stok_minimum).length;

  const roleColors = { superadmin:"bg-purple-100 text-purple-700", admin_bidang:"bg-blue-100 text-blue-700", operator:"bg-emerald-100 text-emerald-700", viewer:"bg-slate-100 text-slate-600" };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Manajemen Gudang</h1>
          <p className="text-sm text-slate-500">{gudang.length} gudang & lokasi terdaftar</p>
        </div>
        <button onClick={() => { setForm({ nama:"", alamat:"", kode_lokasi:"" }); setError(""); setShowAdd(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
          + Tambah Gudang
        </button>
      </div>

      {/* Notifikasi */}
      {success && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm font-semibold text-emerald-700 flex justify-between items-center"><span>{success}</span><button onClick={() => setSuccess("")}>✕</button></div>}
      {error && !showAdd && !showEdit && !showDelete && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm font-semibold text-red-700 flex justify-between items-center"><span>⚠️ {error}</span><button onClick={() => setError("")}>✕</button></div>}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { l: "Total Gudang", v: gudang.length, c: "text-blue-600", bg: "bg-blue-50" },
          { l: "Total Jenis Barang", v: barangList.length, c: "text-emerald-600", bg: "bg-emerald-50" },
          { l: "Total Stok", v: barangList.reduce((a, b) => a + b.stok, 0).toLocaleString("id"), c: "text-slate-800", bg: "bg-slate-50" },
          { l: "Alert Stok", v: barangList.filter(b => b.stok <= b.stok_minimum).length, c: "text-red-600", bg: "bg-red-50" },
        ].map(s => (
          <div key={s.l} className={`${s.bg} rounded-2xl border border-slate-100 p-4`}>
            <p className={`text-2xl font-black ${s.c}`}>{s.v}</p>
            <p className="text-xs text-slate-500 mt-1">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Grid gudang */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Memuat data gudang...</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {gudang.map(g => {
            const brg = getBarangGudang(g.id);
            const nilai = getTotalNilai(g.id);
            const alert = getAlertCount(g.id);
            return (
              <div key={g.id} className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all ${alert > 0 ? "border-red-200" : "border-slate-100"}`}>
                {/* Card header */}
                <div className="p-5 border-b border-slate-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M3 9V7a2 2 0 012-2h14a2 2 0 012 2v2"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{g.nama}</p>
                        <p className="text-xs font-mono text-blue-600 mt-0.5 font-semibold">{g.kode_lokasi}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{g.alamat || "Alamat belum diisi"}</p>
                      </div>
                    </div>
                    {alert > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 flex-shrink-0">⚠ {alert} alert</span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                      <p className="text-lg font-black text-slate-800">{brg.length}</p>
                      <p className="text-xs text-slate-400">Jenis Barang</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                      <p className="text-lg font-black text-slate-800">{brg.reduce((a,b)=>a+b.stok,0).toLocaleString("id")}</p>
                      <p className="text-xs text-slate-400">Total Stok</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                      <p className="text-sm font-black text-slate-800">Rp {(nilai/1e6).toFixed(1)}M</p>
                      <p className="text-xs text-slate-400">Nilai Aset</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 p-3">
                  <button onClick={() => openDetail(g)} className="flex-1 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                    Lihat Detail
                  </button>
                  <button onClick={() => openEdit(g)} className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                    Edit
                  </button>
                  <button onClick={() => openDelete(g)} className="px-3 py-2 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                    Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL TAMBAH ─────────────────────────────────────────────────────── */}
      {showAdd && (
        <Modal title="Tambah Gudang Baru" onClose={() => { setShowAdd(false); setError(""); }}>
          <Field label="Nama Gudang *"><input className={inputCls} placeholder="cth. Gudang C – Jl. Solo" value={form.nama} onChange={e => setForm({...form, nama:e.target.value})} /></Field>
          <Field label="Kode Lokasi *"><input className={inputCls} placeholder="cth. GDG-C" value={form.kode_lokasi} onChange={e => setForm({...form, kode_lokasi:e.target.value})} /><p className="text-xs text-slate-400 mt-1">Akan dikonversi ke huruf kapital otomatis</p></Field>
          <Field label="Alamat Lengkap"><textarea className={inputCls} rows={2} placeholder="cth. Jl. Solo Km.3, Yogyakarta" value={form.alamat} onChange={e => setForm({...form, alamat:e.target.value})} /></Field>
          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 mb-3">⚠️ {error}</div>}
          <div className="flex gap-2 pt-2">
            <button onClick={() => { setShowAdd(false); setError(""); }} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
            <button onClick={handleAdd} disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan Gudang"}</button>
          </div>
        </Modal>
      )}

      {/* ── MODAL EDIT ───────────────────────────────────────────────────────── */}
      {showEdit && selected && (
        <Modal title={`Edit Gudang — ${selected.kode_lokasi}`} onClose={() => { setShowEdit(false); setError(""); }}>
          <Field label="Nama Gudang *"><input className={inputCls} value={form.nama} onChange={e => setForm({...form, nama:e.target.value})} /></Field>
          <Field label="Kode Lokasi *"><input className={inputCls} value={form.kode_lokasi} onChange={e => setForm({...form, kode_lokasi:e.target.value})} /></Field>
          <Field label="Alamat Lengkap"><textarea className={inputCls} rows={2} value={form.alamat} onChange={e => setForm({...form, alamat:e.target.value})} /></Field>
          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 mb-3">⚠️ {error}</div>}
          <div className="flex gap-2 pt-2">
            <button onClick={() => { setShowEdit(false); setError(""); }} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
            <button onClick={handleEdit} disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">{saving ? "Menyimpan..." : "Update Gudang"}</button>
          </div>
        </Modal>
      )}

      {/* ── MODAL KONFIRMASI HAPUS ───────────────────────────────────────────── */}
      {showDelete && selected && (
        <Modal title="Konfirmasi Hapus Gudang" onClose={() => setShowDelete(false)}>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="font-bold text-red-700 text-sm">⚠️ Hapus gudang ini?</p>
            <p className="text-red-600 text-xs mt-1">Tindakan ini tidak bisa dibatalkan.</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-1">
            <div className="flex justify-between"><span className="text-xs text-slate-500">Nama</span><span className="text-xs font-bold text-slate-800">{selected.nama}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-500">Kode</span><span className="text-xs font-mono font-bold text-slate-800">{selected.kode_lokasi}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-500">Jumlah Barang</span><span className="text-xs font-bold text-slate-800">{getBarangGudang(selected.id).length} item</span></div>
          </div>
          {getBarangGudang(selected.id).length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
              ⚠️ Gudang ini masih memiliki <strong>{getBarangGudang(selected.id).length} barang</strong>. Pindahkan atau hapus barang terlebih dahulu sebelum menghapus gudang.
            </div>
          )}
          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 mb-3">⚠️ {error}</div>}
          <div className="flex gap-2">
            <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
            <button onClick={handleDelete} disabled={saving || getBarangGudang(selected.id).length > 0}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-40 transition-colors">
              {saving ? "Menghapus..." : "Ya, Hapus Gudang"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── MODAL DETAIL GUDANG ──────────────────────────────────────────────── */}
      {showDetail && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(15,23,42,0.55)", backdropFilter:"blur(4px)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" style={{ animation:"modalIn .18s ease" }}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="font-bold text-slate-800">{selected.nama}</h3>
                <p className="text-xs font-mono text-blue-600 mt-0.5">{selected.kode_lokasi} — {selected.alamat || "Alamat belum diisi"}</p>
              </div>
              <button onClick={() => setShowDetail(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 flex-shrink-0">
              {[
                { key: "barang", label: `Barang (${getBarangGudang(selected.id).length})` },
                { key: "operator", label: `Pengguna (${operatorList.length})` },
                { key: "info", label: "Info Gudang" },
              ].map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`px-5 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === t.key ? "text-blue-600 border-blue-600" : "text-slate-500 border-transparent hover:text-slate-700"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {/* Tab: Barang */}
              {activeTab === "barang" && (
                <div>
                  {getBarangGudang(selected.id).length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">Belum ada barang di gudang ini</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead><tr className="bg-slate-50 border-b border-slate-100">
                        {["Kode Aset", "Nama Barang", "Kategori", "Stok", "Nilai", "Status"].map(h =>
                          <th key={h} className={`${h==="Stok"||h==="Nilai"?"text-right":"text-left"} px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider`}>{h}</th>
                        )}
                      </tr></thead>
                      <tbody>
                        {getBarangGudang(selected.id).map((b, i) => (
                          <tr key={b.id} className={`border-b border-slate-50 ${i%2===1?"bg-slate-50/40":""}`}>
                            <td className="px-5 py-3 font-mono text-xs text-slate-400">{b.kode_aset}</td>
                            <td className="px-5 py-3 font-semibold text-slate-800">{b.nama}</td>
                            <td className="px-5 py-3 text-xs text-slate-500">{b.kategori}</td>
                            <td className="px-5 py-3 text-right"><span className={`font-bold ${b.stok<=b.stok_minimum?"text-red-600":"text-slate-800"}`}>{b.stok}</span> <span className="text-xs text-slate-400">{b.satuan}</span></td>
                            <td className="px-5 py-3 text-right text-xs font-semibold text-slate-600">Rp {(b.stok*b.harga_satuan/1e6).toFixed(1)}M</td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${b.stok<=b.stok_minimum?"bg-red-100 text-red-600":"bg-emerald-100 text-emerald-700"}`}>
                                {b.stok<=b.stok_minimum?"⚠ Alert":"Normal"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr className="bg-slate-50 border-t border-slate-100">
                        <td colSpan={4} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Total Nilai Gudang</td>
                        <td className="px-5 py-3 text-right text-sm font-black text-slate-800">Rp {(getTotalNilai(selected.id)/1e6).toFixed(2)}M</td>
                        <td/>
                      </tr></tfoot>
                    </table>
                  )}
                </div>
              )}

              {/* Tab: Operator/Pengguna */}
              {activeTab === "operator" && (
                <div className="p-5">
                  {operatorList.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-slate-400 text-sm">Belum ada operator yang ditugaskan</p>
                      <p className="text-slate-400 text-xs mt-1">Assign operator di halaman Manajemen User</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {operatorList.map(op => (
                        <div key={op.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-blue-600">{op.pegawai?.nama?.charAt(0) || "?"}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 text-sm">{op.pegawai?.nama}</p>
                            <p className="text-xs font-mono text-slate-400 mt-0.5">NIP: {op.pegawai?.nip}</p>
                            {op.pegawai?.jabatan && <p className="text-xs text-slate-500 mt-0.5">{op.pegawai.jabatan}</p>}
                          </div>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${roleColors[op.pegawai?.role] || "bg-slate-100 text-slate-600"}`}>
                            {op.pegawai?.role || "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Info */}
              {activeTab === "info" && (
                <div className="p-5 space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    {[
                      ["ID Gudang", selected.id],
                      ["Nama Gudang", selected.nama],
                      ["Kode Lokasi", selected.kode_lokasi],
                      ["Alamat", selected.alamat || "Belum diisi"],
                      ["Dibuat", new Date(selected.created_at).toLocaleDateString("id-ID", {day:"numeric",month:"long",year:"numeric"})],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between items-start gap-4">
                        <span className="text-xs text-slate-500 flex-shrink-0">{k}</span>
                        <span className={`text-xs font-semibold text-slate-800 text-right break-all ${k==="ID Gudang"?"font-mono text-slate-400":""}`}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-blue-600">{getBarangGudang(selected.id).length}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Jenis Barang</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-emerald-600">{getBarangGudang(selected.id).reduce((a,b)=>a+b.stok,0).toLocaleString("id")}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Total Stok</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3 text-center">
                      <p className="text-lg font-black text-amber-600">Rp {(getTotalNilai(selected.id)/1e6).toFixed(1)}M</p>
                      <p className="text-xs text-slate-500 mt-0.5">Nilai Aset</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowDetail(false); openEdit(selected); }} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">Edit Gudang</button>
                    <button onClick={() => { setShowDetail(false); openDelete(selected); }} className="flex-1 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">Hapus Gudang</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
