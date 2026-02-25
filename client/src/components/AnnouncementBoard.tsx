// ===================================================================
// AnnouncementBoard — 管理员公告栏（恐惧贪婪指数右侧）
// ===================================================================

import { trpc } from '@/lib/trpc';
import HudPanel from './HudPanel';
import { useApp } from '@/contexts/AppContext';
import { t } from '@/lib/i18n';
import { Megaphone, ImageIcon } from 'lucide-react';
import { useState } from 'react';

export default function AnnouncementBoard() {
  const { lang } = useApp();
  const { data: announcements, isLoading } = trpc.announcements.active.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const [expandedImg, setExpandedImg] = useState<string | null>(null);

  if (isLoading) {
    return (
      <HudPanel title={lang === 'zh' ? '公告栏' : 'ANNOUNCEMENTS'}>
        <div className="flex items-center justify-center h-32">
          <div className="w-4 h-4 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
        </div>
      </HudPanel>
    );
  }

  if (!announcements || announcements.length === 0) {
    return (
      <HudPanel title={lang === 'zh' ? '公告栏' : 'ANNOUNCEMENTS'}>
        <div className="flex flex-col items-center justify-center h-32 text-red-400/70">
          <Megaphone size={24} className="mb-2" />
          <span className="text-sm">{lang === 'zh' ? '暂无公告' : 'No announcements'}</span>
        </div>
      </HudPanel>
    );
  }

  return (
    <HudPanel title={lang === 'zh' ? '公告栏' : 'ANNOUNCEMENTS'}>
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
        {announcements.map((ann) => (
          <div key={ann.id} className="border-b border-[rgba(0,212,255,0.08)] pb-3 last:border-0 last:pb-0">
            {/* Title */}
            <div className="flex items-center gap-2 mb-1">
              <Megaphone size={12} className="text-red-500 shrink-0" />
              <h4 className="text-sm font-bold text-red-500 truncate">{ann.title}</h4>
            </div>
            {/* Content */}
            <p className="text-[11px] text-red-400/80 leading-relaxed mb-2">{ann.content}</p>
            {/* Image */}
            {ann.imageUrl && (
              <div className="relative">
                <img
                  src={ann.imageUrl}
                  alt={ann.imageCaption || ann.title}
                  className="w-24 h-24 object-contain rounded cursor-pointer hover:opacity-80 transition-opacity border border-[rgba(0,212,255,0.1)]"
                  onClick={() => setExpandedImg(ann.imageUrl)}
                />
                {ann.imageCaption && (
                  <span className="text-sm text-red-400/60 mt-1 block">{ann.imageCaption}</span>
                )}
              </div>
            )}
            {/* Date */}
            <span className="text-sm text-red-400/40 font-mono mt-1 block">
              {new Date(ann.createdAt).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>

      {/* Image lightbox */}
      {expandedImg && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center cursor-pointer"
          onClick={() => setExpandedImg(null)}
        >
          <img src={expandedImg} alt="Expanded" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
    </HudPanel>
  );
}
