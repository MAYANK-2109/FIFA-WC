export default function MessageBubble({ message, isStreaming }) {
    const isUser = message.role === "user";

    return (
        <div
            className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            role="article"
            aria-label={isUser ? "Your message" : "AI response"}
        >
            {/* Avatar */}
            <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-mono font-bold"
                style={isUser
                    ? { background: "rgba(255,30,86,0.2)", border: "1px solid rgba(255,30,86,0.4)", color: "#ff1e56" }
                    : { background: "rgba(204,255,0,0.15)", border: "1px solid rgba(204,255,0,0.35)", color: "#ccff00" }
                }
                aria-hidden="true"
            >
                {isUser ? "U" : "AI"}
            </div>

            {/* Bubble */}
            <div
                className={`relative max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    isUser ? "rounded-tr-sm" : "rounded-tl-sm"
                } ${isStreaming ? "typing-cursor" : ""}`}
                style={isUser
                    ? {
                        background: "linear-gradient(135deg, rgba(255,30,86,0.25) 0%, rgba(255,30,86,0.12) 100%)",
                        border: "1px solid rgba(255,30,86,0.3)",
                        color: "#f0f0f8",
                    }
                    : {
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#d0d0e0",
                    }
                }
            >
                {message.content || (isStreaming ? "" : (
                    <span className="text-white/30 italic text-xs">Empty response</span>
                ))}
            </div>
        </div>
    );
}
