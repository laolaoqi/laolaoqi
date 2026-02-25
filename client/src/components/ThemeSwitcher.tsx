// ===================================================================
// ThemeSwitcher — 左上角三色背景切换器（黑/白/灰）
// ===================================================================

import { useTheme, type Theme } from '@/contexts/ThemeContext';

const THEMES: { id: Theme; label: string; color: string; border: string }[] = [
  { id: 'dark', label: '黑', color: '#0a0e17', border: '#00d4ff' },
  { id: 'light', label: '白', color: '#f8fafc', border: '#0064b4' },
  { id: 'gray', label: '灰', color: '#555d6e', border: '#00d4ff' },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="fixed top-16 left-3 z-50 flex flex-col gap-1.5">
      {THEMES.map(t => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={`w-7 h-7 rounded-full border-2 transition-all duration-200 flex items-center justify-center text-[9px] font-bold shadow-md hover:scale-110 ${
            theme === t.id
              ? 'ring-2 ring-offset-1 ring-[#00d4ff] scale-110'
              : 'opacity-60 hover:opacity-100'
          }`}
          style={{
            backgroundColor: t.color,
            borderColor: theme === t.id ? t.border : 'rgba(128,128,128,0.3)',
            color: t.id === 'light' ? '#333' : '#fff',
          }}
          title={`${t.label}色主题`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
