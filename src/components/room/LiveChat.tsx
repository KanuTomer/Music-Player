import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendChatMessage } from "@/lib/rooms.functions";
import { randomDesiName } from "@/hooks/useRoomSocial";
import type { Database } from "@/integrations/supabase/types";

type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];

interface LiveChatProps {
  roomKey: string;
  roomName: string;
  inlineLauncher?: boolean;
}

const NAME_COLORS = [
  "text-emerald-400",
  "text-purple-400",
  "text-pink-400",
  "text-rose-400",
  "text-amber-400",
  "text-cyan-400",
  "text-violet-400",
  "text-orange-400",
];

function getNameColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % NAME_COLORS.length;
  return NAME_COLORS[index];
}

export function LiveChat({ roomKey, roomName, inlineLauncher = false }: LiveChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typedMessage, setTypedMessage] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [flowState, setFlowState] = useState<"normal" | "get_name">("normal");

  // Load initial messages from sessionStorage (if any) to persist across room switches
  const [messages, setMessagesState] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("sainik_dhaba_local_chat_messages");
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading from sessionStorage:", e);
      }
    }
    return [];
  });

  // Custom setter to keep sessionStorage in sync
  const setMessages = (update: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setMessagesState((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      try {
        // Store last 100 messages to keep storage light
        sessionStorage.setItem(
          "sainik_dhaba_local_chat_messages",
          JSON.stringify(next.slice(-100)),
        );
      } catch (e) {
        console.error("Error writing to sessionStorage:", e);
      }
      return next;
    });
  };

  const [displayName, setDisplayName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sainik_dhaba_display_name") || "";
    }
    return "";
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch initial messages
  useEffect(() => {
    async function loadMessages() {
      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("room_key", roomKey)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error loading chat messages:", error);
        } else if (data) {
          // Merge database messages with existing local messages, removing duplicates
          setMessages((prev) => {
            const merged = [...prev];
            data.forEach((dbMsg) => {
              if (!merged.some((m) => m.id === dbMsg.id)) {
                merged.push(dbMsg);
              }
            });
            return merged.sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            );
          });
        }
      } catch (err) {
        console.error("Failed to fetch chat messages:", err);
      } finally {
        setLoading(false);
      }
    }

    loadMessages();
  }, [roomKey]);

  // Subscribe to real-time additions (both DB inserts and realtime broadcasts)
  useEffect(() => {
    if (!roomKey) return;

    const channel = supabase
      .channel(`chat_messages:${roomKey}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_key=eq.${roomKey}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            // Also deduplicate if we recently optimistically added the exact same message
            const isRecentOptimistic = prev.some(
              (m) =>
                m.session_display_name === newMsg.session_display_name &&
                m.text === newMsg.text &&
                Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime()) <
                  15000,
            );
            if (isRecentOptimistic) {
              return prev.map((m) =>
                m.session_display_name === newMsg.session_display_name &&
                m.text === newMsg.text &&
                Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime()) <
                  15000
                  ? newMsg
                  : m,
              );
            }
            return [...prev, newMsg];
          });
        },
      )
      .on("broadcast", { event: "chat_message" }, ({ payload }) => {
        const newMsg = payload as ChatMessage;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [roomKey]);

  // Auto scroll to bottom
  useEffect(() => {
    scrollToBottom(isOpen ? "auto" : "smooth");
  }, [messages, isOpen]);

  const performSendMessage = async (text: string, nameToUse?: string) => {
    const senderName = nameToUse || displayName;
    if (!senderName) return;

    const tempId = crypto.randomUUID();
    const tempMsg: ChatMessage = {
      id: tempId,
      room_key: roomKey,
      session_display_name: senderName,
      text,
      is_ai_host: false,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    };

    setTypedMessage("");

    // 1. Optimistically add to local state immediately (0ms lag for sender)
    setMessages((prev) => {
      if (prev.some((m) => m.id === tempId)) return prev;
      return [...prev, tempMsg];
    });

    // 2. Broadcast immediately to other connected clients via WebSockets
    if (channelRef.current) {
      void channelRef.current.send({
        type: "broadcast",
        event: "chat_message",
        payload: tempMsg,
      });
    }

    // 3. Persist to database in background
    try {
      await sendChatMessage({
        data: {
          roomKey,
          displayName: senderName,
          text,
        },
      });
    } catch (err) {
      console.warn("DB save note (using realtime broadcast):", err);
    }
  };

  const handleMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    if (!displayName) {
      setNameInput(randomDesiName());
      setFlowState("get_name");
    } else {
      void performSendMessage(typedMessage);
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = nameInput.trim();
    if (!finalName) return;

    localStorage.setItem("sainik_dhaba_display_name", finalName);
    setDisplayName(finalName);
    setFlowState("normal");

    void performSendMessage(typedMessage, finalName);
  };

  return (
    <>
      <div
        className={
          inlineLauncher
            ? "pointer-events-auto relative z-30 flex items-center justify-center"
            : "pointer-events-auto absolute left-3.5 bottom-[calc(10.5rem+env(safe-area-inset-bottom))] z-30 flex items-center sm:left-6 sm:bottom-6"
        }
      >
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex h-9 items-center gap-1.5 sm:gap-2 rounded-full border border-cream/15 bg-charcoal/65 px-2.5 sm:px-3.5 text-xs font-bold text-cream/90 backdrop-blur-md transition-all hover:bg-charcoal/85 hover:text-amber active:scale-95 cursor-pointer shadow-lg"
          aria-label="Open Live Chat"
        >
          <span className="relative flex size-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full size-2 bg-amber-500"></span>
          </span>
          <MessageCircle className="size-4 shrink-0 text-cream/80 group-hover:text-amber" />
          <span className="hidden font-vintage-deva text-[10px] tracking-wider uppercase sm:inline">
            Live Chat
          </span>
        </button>
      </div>

      {/* Centered Chat Modal Dialog */}
      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark backdrop with blur overlay */}
            <div
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            />

            {/* Modal Container */}
            <div className="relative z-10 flex h-[580px] max-h-[82dvh] w-[calc(100%-2rem)] max-w-[440px] flex-col bg-[#200D02] border border-[#3E1E09] rounded-[20px] shadow-lift overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-cream/10 px-5 bg-[#200D02]">
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2">
                    <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2 bg-amber-500"></span>
                  </span>
                  <span className="font-signage text-base font-bold tracking-wide text-cream">
                    Live Chat
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex size-8 items-center justify-center rounded-full bg-[#3B1E0A] border border-[#4d2810] text-cream/70 hover:bg-[#4d2810] hover:text-cream transition-colors cursor-pointer"
                  aria-label="Close Chat"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Scrollable messages area */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 scroll-smooth no-scrollbar">
                {/* Pinned announcement banner */}
                <div className="bg-[#422006]/60 border border-[#3E1E09] text-cream/90 rounded-xl p-3.5 text-xs leading-relaxed flex items-start gap-2.5 shadow-sm">
                  <span className="text-sm shrink-0">📌</span>
                  <div>
                    <span className="font-bold text-amber-400">{roomName} Admin 👑 :</span> Hello
                    all, I am actively monitoring this chat. If you encounter any issues or bugs,
                    please report them here for prompt resolution. Feature requests and new
                    additions are also welcome. Thank you for support.
                  </div>
                </div>

                {loading ? (
                  <div className="flex h-32 flex-col items-center justify-center text-xs text-cream/40 gap-2">
                    <span className="animate-spin text-amber-500 text-lg">📻</span>
                    <span>Tuning in to chat...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center text-center px-6">
                    <p className="text-xs font-semibold text-cream/40">Yaha abhi shanti hai...</p>
                    <p className="text-[10px] text-cream/30 mt-1">
                      Be the first to share a memory or say hello!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {messages.map((msg) => {
                      const timeStr = new Date(msg.created_at)
                        .toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                        .toLowerCase();

                      return (
                        <div key={msg.id} className="flex flex-col">
                          <div className="bg-[#2D1405] border border-[#3E1E09] rounded-xl px-3.5 py-2.5 w-full shadow-sm">
                            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                              <span
                                className={`text-[12px] font-bold ${getNameColor(msg.session_display_name)}`}
                              >
                                {msg.session_display_name}
                              </span>
                              {msg.is_ai_host && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded border border-amber-500/30 font-semibold uppercase tracking-wider">
                                  Host
                                </span>
                              )}
                            </div>
                            <p className="text-[13px] text-cream/90 leading-relaxed break-words whitespace-pre-wrap">
                              {msg.text}
                            </p>
                            <div className="text-[9px] text-cream/45 mt-2 text-right font-medium">
                              {timeStr}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input box section */}
              <div className="border-t border-[#3E1E09] p-5 bg-[#200D02] shrink-0">
                {flowState === "normal" ? (
                  <form onSubmit={handleMessageSubmit} className="flex items-center gap-2.5">
                    <input
                      type="text"
                      value={typedMessage}
                      onChange={(e) => setTypedMessage(e.target.value)}
                      placeholder="Kuchh likhein..."
                      maxLength={300}
                      className="h-11 flex-1 rounded-full border border-cream/15 bg-black/40 px-4 text-[13px] text-cream placeholder:text-cream/25 focus:border-amber-500/50 focus:outline-none transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!typedMessage.trim()}
                      className="flex h-11 px-5 items-center justify-center rounded-full bg-amber-500 text-charcoal font-bold text-xs tracking-wider uppercase transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                      Send
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs">
                      <span className="font-semibold text-amber-400 block">
                        One last step — what's your name?
                      </span>
                      <span className="text-[11px] text-cream/60 mt-0.5 block italic truncate max-w-full">
                        We'll send this as soon as you enter it: "{typedMessage}"
                      </span>
                    </div>
                    <form onSubmit={handleNameSubmit} className="flex items-center gap-2.5">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="Your name..."
                        maxLength={50}
                        required
                        className="h-11 flex-1 rounded-full border border-amber-600 bg-black/50 px-4 text-[13px] text-cream focus:border-amber-500 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={!nameInput.trim()}
                        className="flex h-11 px-5 items-center justify-center rounded-full bg-amber-500 text-charcoal font-bold text-xs tracking-wider uppercase transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
                      >
                        Send
                      </button>
                    </form>
                    <button
                      type="button"
                      onClick={() => setFlowState("normal")}
                      className="text-[10px] text-cream/45 hover:text-cream transition-colors block text-center w-full mt-1 cursor-pointer underline"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
