import React from 'react';
import type { SupabaseConnectionStatus } from '../lib/supabase';

interface SupabaseStatusBadgeProps {
  status: SupabaseConnectionStatus;
  onRetry: () => void;
}

export const SupabaseStatusBadge: React.FC<SupabaseStatusBadgeProps> = ({
  status,
  onRetry,
}) => {
  if (status.state === 'checking') {
    return (
      <div className="no-print fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-white border border-slate-300 px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-md">
        <span aria-hidden="true">🟡</span>
        <span>Memeriksa Koneksi Supabase...</span>
      </div>
    );
  }

  if (status.state === 'connected') {
    return (
      <div
        title="Terhubung ke https://eysccwxpgdcoqfvaalye.supabase.co"
        className="no-print fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-300 px-3.5 py-1.5 text-xs font-semibold text-emerald-900 shadow-md"
      >
        <span aria-hidden="true">🟢</span>
        <span>Supabase Connected (SIMPEL-OBE DB)</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onRetry}
      title={status.message}
      className="no-print fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-red-50 hover:bg-red-100 border border-red-300 px-3.5 py-1.5 text-xs font-semibold text-red-900 shadow-md cursor-pointer"
    >
      <span aria-hidden="true">🔴</span>
      <span className="max-w-[260px] truncate">
        Supabase Error: {status.message}
      </span>
    </button>
  );
};
