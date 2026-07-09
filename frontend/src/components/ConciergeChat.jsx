import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Languages, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { streamConcierge } from "../lib/api";
import MessageBubble from "./MessageBubble";
import QuickPrompts from "./QuickPrompts";

const LANGUAGES = [
    { code: "English",    flag: "🇺🇸" },
    { code: "Spanish",    flag: "🇪🇸" },
    { code: "French",     flag: "🇫🇷" },
    { code: "Portuguese", flag: "🇧🇷" },
    { code: "Arabic",     flag: "🇸🇦" },
    { code: "Hindi",      flag: "🇮🇳" },
    { code: "German",     flag: "🇩🇪" },
    { code: "Japanese",   flag: "🇯🇵" },
];

const WELCOME = {
    id: "welcome",
    role: "assistant",
    content: "Welcome to FIFA 2026! I'm your PITCH.OPS concierge. Ask me about navigation, gates, transport, accessibility, food or match info — in any language.",
};

const sessionStorageKey = (role, venueId) => `pitchops-session-${role}-${venueId || "any"}`;

function useSessionId(role, venueId) {
    const [sessionId] = useState(() => {
        const key = sessionStorageKey(role, venueId);
        const existing = window.sessionStorage.getItem(key);
        if (existing) return existing;
        const id = `${role}-${venueId || "any"}-${crypto.randomUUID().slice(0, 8)}`;
        window.sessionStorage.setItem(key, id);
        return id;
    });
    return sessionId;
}

function useAutoScroll(dep) {
    const ref = useRef(null);
    useEffect(() => {
        const node = ref.current;
        if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    }, [dep]);
    return ref;
}

export default function ConciergeChat({ role, venue }) {
    const venueId = venue?.id;
    const sessionId = useSessionId(role, venueId);
    const [language, setLanguage] = useState("English");
    const [messages, setMessages] = useState([WELCOME]);
    const [input, setInput] = useState("");
    const [streaming, setStreaming] = useState(false);
    const abortRef = useRef(null);
    const listRef = useAutoScroll(messages);
    const inputRef = useRef(null);

    const selectedLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

    const appendDelta = (chunk) =>
        setMessages((prev) => {
            const copy = prev.slice();
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") last.content += chunk;
            return copy;
        });

    const setError = (err) =>
        setMessages((prev) => {
            const copy = prev.slice();
            const last = copy[copy.length - 1];
            if (last?.role === "assistant" && !last.content)
                last.content = `⚠ ${err?.message || "Concierge unavailable. Please check your API key."}`;
            return copy;
        });

    const send = (text) => {
        const msg = (text ?? input).trim();
        if (!msg || streaming) return;
        setInput("");
        const userMsg = { id: `u-${crypto.randomUUID()}`, role: "user", content: msg };
        const asstMsg = { id: `a-${crypto.randomUUID()}`, role: "assistant", content: "" };
        setMessages((prev) => [...prev, userMsg, asstMsg]);
        setStreaming(true);
        abortRef.current = streamConcierge(
            { sessionId, role, language, venueId, message: msg },
            {
                onDelta: appendDelta,
                onDone: () => setStreaming(false),
                onError: (err) => { setError(err); setStreaming(false); },
            },
        );
    };

    const stop = () => { abortRef.current?.(); setStreaming(false); };

    return (
        <section
            data-testid="concierge-panel"
            className="glass border border-white/10 rounded-2xl flex flex-col overflow-hidden"
            style={{ height: "680px", boxShadow: "0 0 40px rgba(204,255,0,0.05)" }}
            aria-label="AI Multilingual Concierge"
        >
            {/* Header */}
            <header className="flex items-center gap-3 px-5 py-4 border-b border-white/08 flex-shrink-0"
                style={{ background: "rgba(204,255,0,0.04)" }}
            >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(204,255,0,0.15)", border: "1px solid rgba(204,255,0,0.3)", boxShadow: "0 0 16px rgba(204,255,0,0.2)" }}>
                    <Sparkles size={18} strokeWidth={2} className="text-[#ccff00]" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-display text-base leading-none text-white">AI Concierge</h3>
                    <p className="text-[10px] font-mono text-white/40 tracking-wider mt-0.5">GEMINI FLASH · MULTI-TURN · STREAMING</p>
                </div>

                {/* Language selector */}
                <label className="flex items-center gap-2 text-xs" data-testid="language-selector-wrap">
                    <Languages size={13} className="text-white/40" aria-hidden="true" />
                    <span className="text-sm">{selectedLang.flag}</span>
                    <select
                        aria-label="Response language"
                        data-testid="language-selector"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="input !py-1 !px-2 !w-auto text-[11px] font-mono !rounded-lg !bg-white/05"
                    >
                        {LANGUAGES.map((l) => (
                            <option key={l.code} value={l.code} className="bg-[#0d0d12]">
                                {l.flag} {l.code}
                            </option>
                        ))}
                    </select>
                </label>
            </header>

            {/* Messages */}
            <div
                ref={listRef}
                className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
                data-testid="concierge-messages"
                role="log"
                aria-live="polite"
                aria-label="Chat messages"
            >
                <AnimatePresence initial={false}>
                    {messages.map((m, idx) => (
                        <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                        >
                            <MessageBubble
                                message={m}
                                isStreaming={streaming && idx === messages.length - 1}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 border-t border-white/08 px-4 pt-3 pb-4 space-y-2"
                style={{ background: "rgba(6,6,8,0.6)" }}
            >
                <QuickPrompts onPick={send} disabled={streaming} />
                <form
                    onSubmit={(e) => { e.preventDefault(); send(); }}
                    className="flex gap-2 items-end"
                >
                    <div className="flex-1 relative">
                        <input
                            ref={inputRef}
                            data-testid="concierge-input"
                            aria-label="Type your question"
                            className="input !rounded-xl !py-3 !pr-4 w-full"
                            placeholder="Ask anything in any language…"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            maxLength={2000}
                            disabled={streaming}
                        />
                    </div>
                    {streaming ? (
                        <button
                            type="button"
                            onClick={stop}
                            className="btn btn-ghost !px-4 !py-3 !rounded-xl flex-shrink-0"
                            data-testid="concierge-stop"
                            aria-label="Stop generation"
                        >
                            <Square size={15} />
                            Stop
                        </button>
                    ) : (
                        <button
                            type="submit"
                            className="btn btn-primary !px-4 !py-3 !rounded-xl flex-shrink-0"
                            disabled={!input.trim()}
                            data-testid="concierge-send"
                            aria-label="Send message"
                        >
                            <Send size={15} /> Send
                        </button>
                    )}
                </form>
            </div>
        </section>
    );
}
