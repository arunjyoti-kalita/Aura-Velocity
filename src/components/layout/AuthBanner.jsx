import { useState, useEffect } from 'react';
import { useApp } from "../../contexts/useApp";
import { X, CloudSync, LogIn, CloudOff } from 'lucide-react';
import clsx from 'clsx';

export function AuthBanner() {
  const { user, signInWithGoogle } = useApp();
  const [isVisible, setIsVisible] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (user) {
      setIsVisible(false);
      return;
    }

    const dismissedUntil = localStorage.getItem('auth_banner_dismissed_until');
    if (!dismissedUntil || new Date().getTime() > parseInt(dismissedUntil)) {
      setIsVisible(true);
    }
  }, [user]);

  const handleDismiss = () => {
    const nextWeek = new Date().getTime() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('auth_banner_dismissed_until', nextWeek.toString());
    setIsVisible(false);
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Banner sign in failed:", error);
    } finally {
      setIsSigningIn(false);
    }
  };

  if (!isVisible || user) return null;

  return (
    <div className="bg-accent/10 border-b border-accent/20 px-6 py-1.5 animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-between gap-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 text-accent">
          <div className="p-2 bg-accent/20 rounded-lg">
            <CloudOff size={18} className="animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold uppercase tracking-wider">Local Mode Active</span>
            <p className="text-xs text-white/60 font-medium">
              Your data is stored locally. Sign in with Google to sync across devices and never lose your work.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDismiss}
            className="px-4 py-1.5 text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest"
          >
            Dismiss for now
          </button>
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className={clsx(
              "flex items-center gap-2 px-5 py-2 bg-accent text-bg-base rounded-full font-bold text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(var(--color-accent),0.3)]",
              isSigningIn && "opacity-50 cursor-wait"
            )}
          >
            {isSigningIn ? (
              <div className="w-4 h-4 border-2 border-bg-base/30 border-t-bg-base rounded-full animate-spin" />
            ) : (
              <LogIn size={14} />
            )}
            Sign In with Google
          </button>
        </div>
      </div>
    </div>
  );
}
