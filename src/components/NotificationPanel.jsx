"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const TIPE_CONFIG = {
  alert_stok: { icon: "⚠️", color: "bg-red-100 text-red-700", border: "border-l-red-400", label: "Stok Alert" },
  transaksi:  { icon: "🔄", color: "bg-blue-100 text-blue-700", border: "border-l-blue-400", label: "Transaksi" },
  barang:     { icon: "📦", color: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-400", label: "Barang" },
  failed_login:{ icon: "🚨", color: "bg-orange-100 text-orange-700", border: "border-l-orange-400", label: "Keamanan" },
  info:       { icon: "ℹ️", color: "bg-slate-100 text-slate-600", border: "border-l-slate-300", label: "Info" },
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff/60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff/3600)} jam lalu`;
  return new Date(dateStr).toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric" });
}

export default function NotificationPanel({ onClose, onUnreadChange }) {
  const [notifs, setNotifs]   = useState([]);
  const [filter, setFilter]   = useState("semua");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifs();
    // Realtime subscription
    const channel = supabase
      .channel("notifikasi_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifikasi" }, () => loadNotifs())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function loadNotifs() {
    const { data } = await supabase
      .from("notifikasi")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifs(data || []);
    onUnreadChange?.((data || []).filter(n => !n.dibaca).length);
    setLoading(false);
  }

  async function markRead(id) {
    await supabase.from("notifikasi").update({ dibaca: true }).eq("id", id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, dibaca: true } : n));
    onUnreadChange?.(notifs.filter(n => !n.dibaca && n.id !== id).length);
  }

  async function markAllRead() {
    await supabase.from("notifikasi").update({ dibaca: true }).eq("dibaca", false);
    setNotifs(prev => prev.map(n => ({ ...n, dibaca: true })));
    onUnreadChange?.(0);
  }

  async function deleteNotif(id) {
    await supabase.from("notifikasi").delete().eq("id", id);
    setNotifs(prev => prev.filter(n => n.id !== id));
    onUnreadChange?.(notifs.filter(n => !n.dibaca && n.id !== id).length);
  }

  const filtered = filter === "semua" ? notifs
    : filter === "belum" ? notifs.filter(n => !n.dibaca)
    : notifs.filter(n => n.tipe === filter);

  const unreadCount = notifs.filter(n => !n.dibaca).length;

  const tabs = [
    { key: "semua", label: "Semua" },
    { key: "belum", label: `Belum Dibaca${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
    { key: "alert_stok", label: "Stok Alert" },
    { key: "transaksi", label: "Transaksi" },
    { key: "failed_login", label: "Keamanan" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-16" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] overflow-hidden flex flex-col"
        style={{ animation: "slideDown .18s ease" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Notifikasi</h3>
            {unreadCount > 0 && <p className="text-xs text-slate-400 mt-0.5">{unreadCount} belum dibaca</p>}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-semibold text-blue-600 hover:underline">
                Tandai semua dibaca
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">✕</button>
          </div>
        </div>

        {/* Filter tabs — scrollable */}
        <div className="flex gap-1 px-3 py-2 border-b border-slate-50 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: "none" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${filter === t.key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-10 text-center text-slate-400 text-sm">Memuat notifikasi...</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-2xl mb-2">🔔</p>
              <p className="text-sm font-semibold text-slate-500">Tidak ada notifikasi</p>
              <p className="text-xs text-slate-400 mt-1">Semua sudah dibaca</p>
            </div>
          ) : filtered.map(n => {
            const cfg = TIPE_CONFIG[n.tipe] || TIPE_CONFIG.info;
            return (
              <div key={n.id}
                className={`flex gap-3 px-4 py-3.5 border-b border-slate-50 border-l-4 ${cfg.border} ${!n.dibaca ? "bg-blue-50/40" : "bg-white"} hover:bg-slate-50 transition-colors cursor-pointer`}
                onClick={() => !n.dibaca && markRead(n.id)}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${cfg.color}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-tight ${!n.dibaca ? "font-bold text-slate-800" : "font-semibold text-slate-600"}`}>
                      {n.judul}
                    </p>
                    <button
                      onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                      className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 text-xs leading-none mt-0.5"
                    >✕</button>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.pesan}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs text-slate-400">{timeAgo(n.created_at)}</span>
                    {!n.dibaca && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0">
          <p className="text-xs text-slate-400 text-center">{notifs.length} notifikasi total • Klik untuk tandai dibaca</p>
        </div>
      </div>
    </div>
  );
}
