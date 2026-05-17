import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../App';
import { Button } from './ui/button';

/**
 * Day / night toggle for the navbar (and dashboard). Saves to user profile when logged in.
 */
export default function ThemeSelector() {
  const { refreshUser } = useAuth();
  const { theme, changeTheme, loading } = useTheme();

  const isLight = theme === 'light';

  const handleToggle = async () => {
    const next = isLight ? 'dark' : 'light';
    const result = await changeTheme(next);
    if (result?.success && typeof refreshUser === 'function') {
      try {
        await refreshUser();
      } catch {
        // ignore
      }
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="shrink-0 border-white/10 text-[var(--theme-text)] hover:bg-white/10 h-9 w-9"
      onClick={handleToggle}
      disabled={loading}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      data-testid="theme-toggle"
    >
      {isLight ? <Moon size={18} className="text-[var(--theme-text)]" /> : <Sun size={18} className="text-amber-300" />}
    </Button>
  );
}
