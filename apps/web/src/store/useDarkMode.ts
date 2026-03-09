import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DarkModeState {
  isDark: boolean;
  toggle: () => void;
}

export const useDarkMode = create<DarkModeState>()(
  persist(
    (set, get) => ({
      isDark: false,
      toggle: () => {
        const next = !get().isDark;
        // ✅ يضيف/يزيل class "dark" من <html>
        document.documentElement.classList.toggle('dark', next);
        set({ isDark: next });
      },
    }),
    { name: 'bloodlink-dark-mode' },
  ),
);

// ✅ تطبيق الـ class عند أول تحميل الصفحة
export const initDarkMode = () => {
  const stored = localStorage.getItem('bloodlink-dark-mode');
  if (stored) {
    const { state } = JSON.parse(stored);
    if (state?.isDark) document.documentElement.classList.add('dark');
  }
};