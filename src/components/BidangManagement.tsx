"use client";

import React, { useState, useEffect } from 'react';
import { LayoutGrid, List, Plus, Building2, MoreVertical, Edit, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BidangManagementProps {
  currentUserRole: string;
}

export default function BidangManagement({ currentUserRole }: BidangManagementProps) {
  const [viewMode, setViewMode] = useState<string>('grid');
  const [dataBidang, setDataBidang] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchBidangUPT();
  }, []);

  const fetchBidangUPT = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bidang_upt')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching bidang_upt:', error.message);
        return;
      }
      
      setDataBidang(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Manajemen Bidang & UPT</h1>
          <p className="text-sm text-slate-400">Kelola Organisasi di lingkungan DPUPKP</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Tampilan Grid"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Tampilan List"
            >
              <List size={18} />
            </button>
          </div>

          <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} />
            + Tambah Bidang/UPT
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-emerald-400">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : dataBidang.length === 0 ? (
        /* Tampilan Jika Data Kosong */
        <div className="flex flex-col items-center justify-center p-16 bg-slate-800/50 border border-slate-700 border-dashed rounded-xl text-slate-400">
          <Building2 size={48} className="mb-4 text-slate-600" />
          <p className="text-lg font-medium text-slate-300">Belum ada data Bidang/UPT</p>
          <p className="text-sm mt-1 text-slate-500">Silakan klik tombol tambah untuk memasukkan data organisasi.</p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {dataBidang.map((item) => (
                <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-500 transition-colors group relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-slate-700/50 p-3 rounded-lg text-emerald-400">
                      <Building2 size={24} />
                    </div>
                    <button className="text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-200 mb-1">{item.nama || '-'}</h3>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-4">
                    <span className="bg-slate-700 px-2 py-1 rounded-md">{item.tipe || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300 border-collapse">
                  <thead className="bg-[#0f172a] text-slate-400">
                    <tr>
                      <th className="px-5 py-4 font-semibold border-b border-slate-700">Nama Organisasi</th>
                      <th className="px-5 py-4 font-semibold border-b border-slate-700">Tipe</th>
                      <th className="px-5 py-4 font-semibold border-b border-slate-700 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {dataBidang.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-5 py-4 font-medium text-slate-200 flex items-center gap-3">
                           <Building2 size={16} className="text-emerald-400" />
                           {item.nama || '-'}
                        </td>
                        <td className="px-5 py-4">
                          <span className="bg-slate-700 text-xs px-2 py-1 rounded-md">{item.tipe || '-'}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2 text-slate-400">
                            <button className="hover:text-emerald-400 transition-colors" title="Edit">
                              <Edit size={16} />
                            </button>
                            {currentUserRole === 'superadmin' && (
                              <button className="hover:text-red-400 transition-colors" title="Hapus">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
