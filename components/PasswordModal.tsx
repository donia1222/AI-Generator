"use client";

import { useState } from "react";

const SESSION_KEY = "gen_auth";

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

export function setAuthenticated(): void {
  sessionStorage.setItem(SESSION_KEY, "1");
}

interface PasswordModalProps {
  open: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PasswordModal({ open, onSuccess, onCancel }: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!password.trim()) return;
    setChecking(true);
    setError(false);

    try {
      const res = await fetch("/api/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = await res.json();

      if (data.valid) {
        setAuthenticated();
        setPassword("");
        onSuccess();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-start justify-center pt-[20vh] max-md:pt-[8vh] overflow-y-auto overscroll-none">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[6px]" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[400px] max-w-[92vw] overflow-hidden mb-[40vh] max-md:mb-[60vh]">
        <div className="px-6 pt-6 pb-2 text-center">
          <div className="w-14 h-14 bg-begonia-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-begonia-400">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gunpowder-900 mb-1">Passwort erforderlich</h3>
          <p className="text-sm text-gunpowder-400 mb-2">Gib das Passwort ein, um zu generieren.</p>
          <p className="text-[13px] text-gunpowder-400 mb-5">
            Um diese Funktion freizuschalten, kontaktiere{" "}
            <a href="https://www.lweb.ch/#contact" target="_blank" rel="noopener noreferrer" className="text-cerulean-500 font-semibold hover:underline">
              lweb.ch
            </a>
          </p>
        </div>

        <div className="px-6 pb-6">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="Passwort"
            autoFocus
            className={`w-full px-4 py-3 rounded-xl border-2 text-base font-medium text-gunpowder-900 bg-gunpowder-50 transition-all outline-none placeholder:text-gunpowder-300 ${
              error ? "border-red-400 bg-red-50" : "border-gunpowder-200 focus:border-begonia-400"
            }`}
          />
          {error && (
            <p className="text-red-500 text-sm font-semibold mt-2">Falsches Passwort</p>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={onCancel}
              className="flex-1 h-12 rounded-xl text-sm font-semibold text-gunpowder-500 bg-gunpowder-100 hover:bg-gunpowder-200 transition-all cursor-pointer border-none"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit}
              disabled={checking || !password.trim()}
              className="flex-1 h-12 rounded-xl text-sm font-semibold text-white bg-begonia-400 hover:bg-[#ff8a91] transition-all cursor-pointer border-none shadow-[0_4px_16px_rgba(254,108,117,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checking ? "Prüfe..." : "Bestätigen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
