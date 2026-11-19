import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { CRYSTAL_PALETTE } from '../shared/boardData.ts';
import { ChatMessage } from '../shared/gameTypes.ts';

interface ChatPanelProps {
  title: string;
  subtitle?: string;
  messages: ChatMessage[];
  currentUserId: string;
  placeholder?: string;
  compact?: boolean;
  onSendMessage: (text: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  title,
  subtitle,
  messages,
  currentUserId,
  placeholder = 'Send a message to runners...',
  compact = false,
  onSendMessage,
}) => {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draft.trim();
    if (!cleaned) return;
    onSendMessage(cleaned);
    setDraft('');
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-[#131B2E] flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2 bg-[#0F1627]">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 truncate">
            <MessageSquare className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{title}</span>
          </h3>
          {subtitle && (
            <p className="text-[11px] text-slate-400 truncate mt-0.5">{subtitle}</p>
          )}
        </div>
        <span className="font-mono-tabular text-[11px] text-slate-400 shrink-0">
          {messages.length} msgs
        </span>
      </div>

      <div
        ref={listRef}
        className={`${compact ? 'h-44' : 'h-64'} overflow-y-auto p-3 space-y-2.5 bg-[#0B101B]/60`}
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-xs text-slate-500 px-4">
            No messages yet. Say hello or coordinate your next race!
          </div>
        ) : (
          messages.map((m) => {
            const pal = CRYSTAL_PALETTE[m.crystalColor] ?? CRYSTAL_PALETTE.ruby;
            const isSelf = m.senderId === currentUserId;
            const timeLabel = new Date(m.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <div
                key={m.id}
                className={`rounded-lg px-3 py-2 border text-xs ${
                  isSelf
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-[#131B2E]/90 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${pal.bgClass}`} />
                    <span className="font-semibold text-slate-100 truncate">
                      {m.senderName}
                      {isSelf ? ' (You)' : ''}
                    </span>
                    <span className="text-[10px] text-amber-300/90 truncate">
                      · {m.playerRank}
                    </span>
                  </div>
                  <span className="font-mono-tabular text-[10px] text-slate-500 shrink-0">
                    {timeLabel}
                  </span>
                </div>
                <p className="text-slate-200 leading-relaxed break-words">{m.text}</p>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-2.5 border-t border-slate-800 bg-[#0F1627] flex items-center gap-2"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={240}
          placeholder={placeholder}
          className="flex-1 min-h-[40px] px-3 py-1.5 text-xs bg-[#0B101B] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="min-h-[40px] px-3.5 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 disabled:opacity-45 transition-colors inline-flex items-center gap-1.5 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          Send
        </button>
      </form>
    </div>
  );
};
