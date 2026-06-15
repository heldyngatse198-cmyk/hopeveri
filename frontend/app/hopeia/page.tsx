'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Send, Sparkles } from 'lucide-react';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
};

type HopeIAChatResponse = {
  reply: string;
  allowed: {
    copilot: boolean;
    tools: Record<string, boolean>;
  };
  model?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:8001';

export default function HopeIAChatPage() {
  const { token } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canChat = !!token;

  useEffect(() => {
    if (!canChat) return;
    // seed welcome
    setMessages([
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          "Salut ! Je suis HopeIA (copilote). Dis-moi ce que tu veux faire, et je vérifierai tes autorisations avant d’utiliser des capacités.",
        createdAt: Date.now(),
      },
    ]);
  }, [canChat]);

  const chatDisabledBanner = useMemo(() => {
    if (!canChat) return 'Connecte-toi pour utiliser HopeIA.';
    return null;
  }, [canChat]);

  async function sendMessage() {
    setError(null);
    if (!token) {
      setError('Connecte-toi d’abord.');
      return;
    }
    const text = input.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/hopeia/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
        }),
      });

      const data = (await response.json().catch(() => null)) as HopeIAChatResponse | { error: string };

      if (!response.ok) {
        const msg = (data as any)?.error || 'Erreur lors de la requête HopeIA.';
        throw new Error(msg);
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: (data as HopeIAChatResponse).reply,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface text-white px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">HopeIA</p>
            <h1 className="mt-2 text-3xl font-semibold">Chat copilote</h1>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-200">
            <Sparkles size={18} />
            <span className="text-sm font-semibold">Mode autorisé</span>
          </div>
        </div>

        {chatDisabledBanner && (
          <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm font-semibold text-rose-200">
            {chatDisabledBanner}
          </div>
        )}

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-soft backdrop-blur-xl">
          <div className="h-[55vh] overflow-auto rounded-2xl border border-white/10 bg-surface/40 p-4">
            {messages.length === 0 ? (
              <div className="text-sm text-slate-300">Aucun message.</div>
            ) : (
              <div className="space-y-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.role === 'user'
                        ? 'flex justify-end'
                        : m.role === 'assistant'
                          ? 'flex justify-start'
                          : 'flex justify-center'
                    }
                  >
                    <div
                      className={
                        m.role === 'user'
                          ? 'max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-none border border-cyan-400/20 bg-cyan-500/15 p-3 text-slate-100'
                          : 'max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tl-none border border-white/10 bg-white/5 p-3 text-slate-100'
                      }
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm font-semibold text-rose-200">
              {error}
            </div>
          )}

          <div className="mt-4 flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={canChat ? 'Écris ton message...' : 'Connecte-toi pour écrire...'}
              disabled={!canChat || loading}
              className="min-h-[56px] w-full resize-none rounded-2xl border border-white/10 bg-surface/70 p-3 text-sm text-white placeholder:text-slate-400 outline-none focus:border-cyan-400/40"
            />
            <button
              onClick={sendMessage}
              disabled={!canChat || loading || input.trim().length === 0}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500 to-violet-500 px-4 py-3 text-sm font-semibold text-surface shadow-soft transition hover:opacity-95 disabled:opacity-60"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

