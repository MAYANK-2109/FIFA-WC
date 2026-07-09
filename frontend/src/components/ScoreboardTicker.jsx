import Marquee from "react-fast-marquee";
import { Flag, Train, AlertTriangle, Trophy, Zap } from "lucide-react";

export default function ScoreboardTicker({ matches = [], incidents = [], venue }) {
    const items = [];

    matches.forEach((m) => {
        items.push({
            key: `m-${m.id}`,
            icon: m.status === "LIVE"
                ? <Flag size={13} className="text-[#ccff00]" />
                : <Trophy size={13} className="text-white/40" />,
            text: `${m.home}  ${m.score}  ${m.away}`,
            tag: m.status === "LIVE" ? `LIVE · ${m.minute}'` : m.status,
            tone: m.status === "LIVE" ? "#ccff00" : "rgba(255,255,255,0.35)",
            live: m.status === "LIVE",
        });
    });

    if (venue) {
        items.push({
            key: "t-metro",
            icon: <Train size={13} className="text-[#00e5ff]" />,
            text: `Metro to ${venue.name}: +6 min delay on Line 3`,
            tag: "TRANSPORT",
            tone: "#00e5ff",
            live: false,
        });
    }

    incidents.slice(0, 3).forEach((i) => {
        items.push({
            key: `i-${i.id}`,
            icon: <AlertTriangle size={13} className="text-[#ffd600]" />,
            text: `${i.category} · Zone ${i.zone} · ${i.ai_summary}`,
            tag: i.severity,
            tone: "#ffd600",
            live: false,
        });
    });

    if (items.length === 0) {
        items.push({
            key: "empty",
            icon: <Zap size={13} className="text-[#ff1e56]" />,
            text: "WELCOME TO FIFA WORLD CUP 2026 — 16 VENUES · 48 NATIONS · 104 MATCHES",
            tag: "",
            tone: "#ff1e56",
            live: false,
        });
    }

    return (
        <div
            data-testid="scoreboard-ticker"
            aria-label="Live scoreboard ticker"
            className="relative overflow-hidden border-b border-white/08"
            style={{
                background: "linear-gradient(90deg, rgba(255,30,86,0.06) 0%, rgba(6,6,8,0.95) 15%, rgba(6,6,8,0.95) 85%, rgba(0,229,255,0.05) 100%)",
            }}
        >
            {/* Left "LIVE" badge */}
            <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-4 border-r border-white/10"
                style={{ background: "rgba(6,6,8,0.98)" }}>
                <div className="flex items-center gap-2">
                    <span className="live-dot" aria-hidden="true" />
                    <span className="text-[9px] font-mono tracking-[0.22em] text-[#ccff00] font-bold">LIVE</span>
                </div>
            </div>

            {/* Right fade */}
            <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to right, transparent, rgba(6,6,8,0.98))" }} />

            <Marquee gradient={false} speed={48} pauseOnHover style={{ paddingLeft: "80px" }}>
                {items.map((it) => (
                    <span
                        key={it.key}
                        className="inline-flex items-center gap-3 px-6 py-2.5 border-r border-white/08"
                    >
                        {it.icon}
                        <span className="font-mono text-[11px] uppercase tracking-wider text-white/80">
                            {it.text}
                        </span>
                        {it.tag && (
                            <span
                                className="font-mono text-[9px] tracking-widest px-1.5 py-0.5 rounded-full border"
                                style={{
                                    color: it.tone,
                                    borderColor: `${it.tone}44`,
                                    background: `${it.tone}12`,
                                }}
                            >
                                {it.tag}
                            </span>
                        )}
                        <span className="text-white/15 mx-2">◆</span>
                    </span>
                ))}
            </Marquee>
        </div>
    );
}
