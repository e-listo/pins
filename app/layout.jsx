"use client";
import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Icon, IconPaths } from "../src/components/ui/Icons";
import { getPegawai } from "../src/lib/auth";
import { supabase } from "../src/lib/supabase"; 
import ProfileUser from "../src/components/ProfileUser";
import { ThemeProvider } from "next-themes";
import ThemeToggle from "../src/components/ThemeToggle";
import { isSuperadmin, canBypassMaintenance } from "../src/lib/roles";

const navItems = [
  { key: "/barang", label: "Barang", icon: IconPaths.barang },
  { key: "/transaksi", label: "Transaksi", icon: IconPaths.transaksi },
  { key: "/gudang", label: "Gudang", icon: IconPaths.gudang },
  { key: "/kategori", label: "Kategori", icon: IconPaths.kategori, adminOnly: true },
  { key: "/bidang", label: "Bidang/UPT", icon: IconPaths.gudang, adminOnly: true },
  { key: "/user", label: "Pengguna", icon: IconPaths.user, adminOnly: true },
  { key: "/pengaturan", label: "Pengaturan", icon: IconPaths.laporan, adminOnly: true },
  { key: "/qr", label: "QR Scan", icon: IconPaths.qrcode[0] },
  { key: "/laporan", label: "Laporan", icon: IconPaths.laporan },
];

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const isFullScreenPage = pathname === "/login" || pathname === "/maintenance"; 
  
  const [showProfile, setShowProfile] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(!isFullScreenPage);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    if (!isFullScreenPage) {
      getPegawai().then(async (data) => {
        if (!data) {
          window.location.href = "/login";
        } else {
          try {
            const { data: config } = await supabase.from('pengaturan_sistem').select('maintenance_mode').eq('id', 1).single();
            const bolehBypass = canBypassMaintenance(data);
            
            if (config?.maintenance_mode && !bolehBypass) {
              window.location.href = "/maintenance";
              return; 
            }
            setCurrentUser(data); 
            setIsCheckingAuth(false);
          } catch (err) {
            setCurrentUser(data); 
            setIsCheckingAuth(false);
          }
        }
      }).catch(() => { window.location.href = "/login"; });
    } else {
      setIsCheckingAuth(false);
    }
  }, [isFullScreenPage]);

  if (!isMounted || (isCheckingAuth && !isFullScreenPage)) {
    return (
      <html lang="id" suppressHydrationWarning>
        <body className="bg-slate-50 dark:bg-[#0f172a] flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400 text-sm font-semibold tracking-widest uppercase">PINS PUPKP...</p>
          </div>
        </body>
      </html>
    );
  }

  const isSuperAdmin = isSuperadmin(currentUser);
  const visibleNavItems = navItems.filter(n => !n.adminOnly || isSuperAdmin);
  
  const qrItem = navItems.find(n => n.key === "/qr");
  const otherItems = visibleNavItems.filter(n => n.key !== "/qr");
  const leftNav = otherItems.slice(0, 2);
  const rightNav = otherItems.slice(2, 3);
  const moreNav = otherItems.slice(3);

  const userAvatar = currentUser?.foto_url || currentUser?.avatar_url;

  return (
    <html lang="id" suppressHydrationWarning>
      <head><title>PINS - DPUPKP Kota Yogyakarta</title></head>
      <body className="bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {isFullScreenPage ? children : (
            <div className="flex min-h-screen">
              <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#1e293b] border-r border-slate-200 dark:border-slate-800 transition-colors">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col justify-center flex-shrink-0 min-h-[110px]">
                  <Link href="/" className="group block">
                    <img src="/logo.png" alt="Logo" className="w-40 mb-2 group-hover:opacity-80 transition-opacity" />
                  </Link>
                  <p className="text-[8px] leading-tight text-slate-400 uppercase font-bold tracking-tighter">
                    Dinas Pekerjaan Umum Perumahan dan Kawasan Permukiman Kota Yogyakarta
                  </p>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                  {visibleNavItems.map((n) => {
                    const active = pathname === n.key || pathname.startsWith(n.key + '/');
                    return (
                      <Link href={n.key} key={n.key} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? "bg-accent/10 text-accent font-bold" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                        <Icon d={n.icon} size={18} color="currentColor" />
                        <span className="text-sm">{n.label}</span>
                      </Link>
                    );
                  })}
                </nav>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center font-medium">
                    © 2026 Dinas PUPKP Kota Yogyakarta
                  </p>
                </div>
              </aside>

              <main className="flex-1 flex flex-col min-w-0">
                <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4 px-4 md:px-8 flex justify-between items-center transition-colors">
                  <div className="md:hidden flex items-center">
                    <Link href="/">
                      <img src="/logo.png" alt="Logo PINS" className="h-12 w-auto object-contain active:scale-95 transition-transform" />
                    </Link>
                  </div>
                  <h2 className="hidden md:block text-sm font-bold text-slate-400 uppercase tracking-widest">
                    {pathname === "/" ? "Dashboard" : pathname.substring(1)}
                  </h2>
                  <div className="flex items-center gap-3 md:gap-4 ml-auto">
                    <ThemeToggle />
                    <button onClick={() => setShowProfile(true)} className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-accent/20 border border-accent/30 overflow-hidden hover:border-accent transition-colors shrink-0">
                      {userAvatar ? <img src={userAvatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-accent font-bold text-xs">U</div>}
                    </button>
                  </div>
                </header>
                <div className="p-4 md:p-8 pb-24 md:pb-8">{children}</div>
              </main>

              <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#1e293b] border-t border-slate-200 dark:border-slate-800 flex justify-between items-center h-16 px-1 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-colors">
                {leftNav.map((n) => {
                  const active = pathname === n.key || pathname.startsWith(n.key + '/');
                  return (
                    <Link href={n.key} key={n.key} className={`flex flex-col items-center justify-center w-1/5 h-full gap-1 transition-colors ${active ? "text-accent" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}>
                      <Icon d={n.icon} size={22} color="currentColor" />
                      <span className="text-[10px] font-medium tracking-tight truncate max-w-full px-1">{n.label}</span>
                    </Link>
                  );
                })}
                {qrItem && (
                  <Link href={qrItem.key} className={`flex flex-col items-center justify-center w-1/5 h-full gap-1 transition-colors ${pathname === qrItem.key ? "text-accent" : "text-slate-700 dark:text-slate-300"}`}>
                    <div className="bg-accent/10 p-2 rounded-full mb-[-4px]">
                      <Icon d={qrItem.icon} size={24} color="currentColor" className="text-accent" />
                    </div>
                    <span className="text-[10px] font-bold text-accent tracking-tight truncate max-w-full px-1">QR Scan</span>
                  </Link>
                )}
                {rightNav.map((n) => {
                  const active = pathname === n.key || pathname.startsWith(n.key + '/');
                  return (
                    <Link href={n.key} key={n.key} className={`flex flex-col items-center justify-center w-1/5 h-full gap-1 transition-colors ${active ? "text-accent" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}>
                      <Icon d={n.icon} size={22} color="currentColor" />
                      <span className="text-[10px] font-medium tracking-tight truncate max-w-full px-1">{n.label}</span>
                    </Link>
                  );
                })}
                <button onClick={() => setShowMoreMenu(true)} className="flex flex-col items-center justify-center w-1/5 h-full gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400">
                  <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="text-[10px] font-medium tracking-tight truncate max-w-full px-1">Lainnya</span>
                </button>
              </nav>

              {showMoreMenu && (
                <div className="md:hidden fixed inset-0 z-50 flex items-end">
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowMoreMenu(false)}></div>
                  <div className="relative w-full bg-white dark:bg-[#1e293b] rounded-t-3xl shadow-2xl p-6 pb-8 animate-in slide-in-from-bottom-full duration-300">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">Menu Lainnya</h3>
                      <button onClick={() => setShowMoreMenu(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      {moreNav.map((n) => {
                        const active = pathname === n.key || pathname.startsWith(n.key + '/');
                        return (
                          <Link 
                            href={n.key} 
                            key={n.key} 
                            onClick={() => setShowMoreMenu(false)}
                            className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-colors ${active ? "bg-accent/10 text-accent" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                          >
                            <Icon d={n.icon} size={26} color="currentColor" />
                            <span className="text-[10px] text-center font-semibold leading-tight">{n.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {showProfile && <ProfileUser onClose={() => setShowProfile(false)} />}
            </div>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
