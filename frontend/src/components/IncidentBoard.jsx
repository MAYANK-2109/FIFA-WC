import { useEffect, useState } from "react";
import { listIncidents, updateIncident } from "../lib/api";
import { ShieldAlert, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SEV_CFG = {
    CRITICAL: { color: "#ff1e56", bg: "rgba(255,30,86,0.1)",  border: "rgba(255,30,86,0.35)",  left: "#ff1e56" },
    HIGH:     { color: "#ffd600", bg: "rgba(255,214,0,0.08)", border: "rgba(255,214,0,0.3)",   left: "#ffd600" },
    MEDIUM:   { color: "#00e5ff", bg: "rgba(0,229,255,0.07)", border: "rgba(0,229,255,0.25)",  left: "#00e5ff" },
    LOW:      { color: "#a0a0b8", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.1)", left: "#555" },
};

const STATUS_COLORS = {
    OPEN: "#ff1e56", IN_PROGRESS: "#ffd600", RESOLVED: "#ccff00",
};

export default function IncidentBoard({ venue, refreshKey }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const venueId = venue?.id;
        let alive = true;
        setLoading(true);
        const refresh = () =>
            listIncidents(venueId).then((r) => { if (alive) setRows(r); }).catch(() => {});
        refresh().finally(() => { if (alive) setLoading(false); });
        const t = setInterval(refresh, 20000);
        return () => { alive = false; clearInterval(t); };
    }, [venue?.id, refreshKey]);

    const advance = async (i) => {
        const next = i.status === "OPEN" ? "IN_PROGRESS" : "RESOLVED";
        await updateIncident(i.id, next);
        setRows((r) => r.map((x) => (x.id === i.id ? { ...x, status: next } : x)));
    };

    const openCount = rows.filter((r) => r.status !== "RESOLVED").length;

    return (
        <section data-testid="incident-board" className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center gap-3 px-5 py-4 border-b border-white/08 flex-shrink-0"
                style={{ background: "rgba(255,30,86,0.04)" }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,30,86,0.15)", border: "1px solid rgba(255,30,86,0.3)" }}>
                    <ShieldAlert size={17} className="text-[#ff1e56]" />
                </div>
                <div>
                    <h3 className="font-display text-base leading-none text-white">Incident Board</h3>
                    <p className="text-[10px] font-mono text-white/40 tracking-wider mt-0.5">AI TRIAGE · AUTO-ROUTED</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <span
                        className="text-[10px] font-mono tracking-widest px-2.5 py-1 rounded-full border"
                        style={{ color: "#ff1e56", borderColor: "rgba(255,30,86,0.3)", background: "rgba(255,30,86,0.1)" }}
                        data-testid="incident-count"
                    >
                        {openCount} OPEN · {rows.length} TOTAL
                    </span>
                </div>
            </header>

            {/* List */}
            <div className="flex-1 overflow-y-auto max-h-[480px]">
                {loading && (
                    <div className="p-5 space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-20 skeleton rounded-xl" />
                        ))}
                    </div>
                )}
                {!loading && rows.length === 0 && (
                    <div className="p-8 text-center">
                        <CheckCircle2 size={32} className="text-[#ccff00] mx-auto mb-3" />
                        <div className="text-white/50 text-sm font-mono">All clear — no incidents</div>
                    </div>
                )}
                <AnimatePresence initial={false}>
                    {rows.map((i) => {
                        const cfg = SEV_CFG[i.severity] || SEV_CFG.LOW;
                        const statusColor = STATUS_COLORS[i.status] || "#a0a0b8";
                        return (
                            <motion.article
                                key={i.id}
                                data-testid={`incident-${i.id}`}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 12 }}
                                transition={{ duration: 0.25 }}
                                className="relative flex gap-4 px-5 py-4 border-b border-white/05 hover:bg-white/[0.025] transition-colors group"
                            >
                                {/* Left accent bar */}
                                <div
                                    className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
                                    style={{ background: cfg.left, opacity: 0.8 }}
                                    aria-hidden="true"
                                />

                                {/* Severity badge */}
                                <div
                                    className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[9px] font-mono tracking-widest font-bold self-start"
                                    style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
                                >
                                    {i.severity}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-[10px] font-mono text-white/50 tracking-wide flex-wrap">
                                        <span className="text-white/70">{i.category}</span>
                                        <span className="text-white/25">·</span>
                                        <span>Zone {i.zone}</span>
                                        <span className="text-white/25">·</span>
                                        <span>{i.department}</span>
                                        <span className="ml-auto">{new Date(i.created_at).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-sm mt-1.5 text-white/85 leading-snug">{i.ai_summary}</p>
                                    <p className="text-xs text-white/45 mt-1 leading-snug">→ {i.recommended_action}</p>
                                </div>

                                {/* Status + action */}
                                <div className="flex-shrink-0 flex flex-col items-end gap-2 self-start">
                                    <span
                                        className="text-[9px] font-mono tracking-widest px-2 py-0.5 rounded-full border"
                                        style={{ color: statusColor, borderColor: `${statusColor}44`, background: `${statusColor}12` }}
                                    >
                                        {i.status}
                                    </span>
                                    {i.status !== "RESOLVED" && (
                                        <button
                                            className="btn btn-ghost !px-2.5 !py-1.5 !text-[10px] !rounded-lg"
                                            onClick={() => advance(i)}
                                            data-testid={`advance-${i.id}`}
                                            aria-label="Advance status"
                                        >
                                            <ArrowRight size={11} />
                                            {i.status === "OPEN" ? "ACK" : "RESOLVE"}
                                        </button>
                                    )}
                                </div>
                            </motion.article>
                        );
                    })}
                </AnimatePresence>
            </div>
        </section>
    );
}

export { ShieldAlert as AlertTriangle };
