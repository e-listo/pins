'use client';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const presetColors = [
  { name: 'Amber', primary: '#fbbf24', hover: '#f59e0b' },
  { name: 'Blue', primary: '#3b82f6', hover: '#2563eb' },
  { name: 'Emerald', primary: '#10b981', hover: '#059669' },
  { name: 'Rose', primary: '#f43f5e', hover: '#e11d48' },
  { name: 'Violet', primary: '#8b5cf6', hover: '#7c3aed' },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Ambil warna simpanan user
    const savedColor = localStorage.getItem('pins-accent') || '#fbbf24';
    const savedHover = localStorage.getItem('pins-hover') || '#f59e0b';
    updateTheme(savedColor, savedHover);
  }, []);

  const updateTheme = (primary, hover) => {
    document.documentElement.style.setProperty('--accent-color', primary);
    document.documentElement.style.setProperty('--accent-hover', hover);
    localStorage.setItem('pins-accent', primary);
    localStorage.setItem('pins-hover', hover);
  };

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-1.5 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      {/* Dot Warna Aksen */}
      <div className="flex gap-2 pr-3 border-r border-slate-300 dark:border-slate-600">
        {presetColors.map((c) => (
          <button
            key={c.name}
            onClick={() => updateTheme(c.primary, c.hover)}
            className="w-4 h-4 rounded-full border border-white/20 transition-transform hover:scale-125 shadow-sm"
            style={{ backgroundColor: c.primary }}
          />
        ))}
      </div>

      {/* Switcher Mode Gelap/Terang */}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="text-lg hover:scale-110 transition-transform"
      >
        {theme === 'dark' ? '🌞' : '🌙'}
      </button>
    </div>
  );
}
