import { useEffect, useState } from "react";
import { getCrowd } from "../lib/api";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";

const STATUS_CONFIG = {
    CRITICAL: { color: "#ff1e56", bg: "rgba(255,30,86,0.15)", border: "rgba(255,30,86,0.5)", label: "CRIT" },
    HIGH:     { color: "#ffd600", bg: "rgba(255,214,0,0.12)",  border: "rgba(255,214,0,0.4)",  label: "HIGH" },
    MEDIUM:   { color: "#00e5ff", bg: "rgba(0,229,255,0.10)",  border: "rgba(0,229,255,0.35)", label: "MED"  },
    LOW:      { color: "#ccff00", bg: "rgba(204,255,0,0.10)",  border: "rgba(204,255,0,0.3)",  label: "LOW"  },
};

function OccupancyRing({ pct }) {
    const r = 38;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    const color = pct > 85 ? "#ff1e56" : pct > 65 ? "#ffd600" : "#ccff00";

    return (
        <div className="relative w-24 h-24 flex-shrink-0" role="img" aria-label={`Occupancy ${pct}%`}>
            <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
                <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
                <circle
                    cx="48" cy="48" r={r} fill="none"
                    stroke={color} strokeWidth="7"
                    strokeDasharray={`${dash} ${circ}`}
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: "stroke-dasharray 0.8s ease" }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-xl font-bold leading-none" style={{ color }}>{pct}%</span>
                <span className="text-[8px] font-mono tracking-widest text-white/40 mt-0.5">OCC</span>
            </div>
        </div>
    );
}

export default function CrowdHeatmap({ venue, onData }) {
    const [snap, setSnap] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!venue?.id) return undefined;
        const venueId = venue.id;
        let alive = true;
        const load = async () => {
            try {
                const s = await getCrowd(venueId);
                if (!alive) return;
                setSnap(s);
                onData?.(s);
            } finally {
                if (alive) setLoading(false);
            }
        };
        load();
        const t = setInterval(load, 15000);
        return () => { alive = false; clearInterval(t); };
    }, [venue?.id, onData]);

    if (!venue) return null;

    return (
        <section data-testid="crowd-heatmap" className="p-5 h-full flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.3)" }}>
                        <Activity size={17} className="text-[#00e5ff]" />
                    </div>
                    <div>
                        <h3 className="font-display text-base leading-none text-white">Crowd Density</h3>
                        <p className="text-[10px] font-mono text-white/40 tracking-wider mt-0.5">
                            {venue.name} · LIVE · 15s refresh
                        </p>
                    </div>
                </div>
                {snap && <OccupancyRing pct={snap.occupancy_pct} />}
            </header>

            {loading && !snap ? (
                <div className="flex-1 grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className="aspect-square skeleton rounded-lg" />
                    ))}
                </div>
            ) : snap ? (
                <div className="flex flex-col gap-4 flex-1">
                    {/* Zone tiles */}
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2" data-testid="heatmap-grid">
                        {snap.zones.map((z, idx) => {
                            const cfg = STATUS_CONFIG[z.status] || STATUS_CONFIG.LOW;
                            return (
                                <motion.div
                                    key={z.zone}
                                    data-testid={`zone-${z.zone}`}
                                    role="figure"
                                    aria-label={`Zone ${z.zone} — ${z.density_pct}%, ${z.status}`}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: idx * 0.02 }}
                                    className={`aspect-square rounded-lg p-2 flex flex-col justify-between ${z.status === "CRITICAL" ? "tile-critical" : ""}`}
                                    style={{
                                        background: cfg.bg,
                                        border: `1px solid ${cfg.border}`,
                                    }}
                                >
                                    <span className="font-display text-sm leading-none text-white/80">{z.zone}</span>
                                    <div>
                                        <div className="font-mono text-sm font-bold" style={{ color: cfg.color }}>
                                            {z.density_pct}%
                                        </div>
                                        <div className="text-[8px] font-mono tracking-widest" style={{ color: cfg.color, opacity: 0.7 }}>
                                            {cfg.label}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Occupancy info */}
                    <div className="text-[10px] font-mono text-white/40 tracking-wide" data-testid="occupancy-pct" aria-live="polite">
                        {snap.occupancy.toLocaleString()} / {snap.capacity.toLocaleString()} fans · {snap.occupancy_pct}% capacity
                    </div>

                    {/* Gates */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2" data-testid="gates-list">
                        {snap.gates.map((g) => {
                            const flowColor = g.flow === "INBOUND" ? "#ccff00" : g.flow === "OUTBOUND" ? "#00e5ff" : "#555";
                            return (
                                <div
                                    key={g.gate}
                                    className="rounded-lg p-2.5 flex flex-col gap-1 border border-white/08"
                                    style={{ background: "rgba(255,255,255,0.03)" }}
                                >
                                    <span className="font-display text-xs text-white/70">{g.gate}</span>
                                    <span className="font-mono text-sm font-bold text-white">{g.wait_min}m</span>
                                    <span
                                        className="text-[8px] font-mono tracking-widest"
                                        style={{ color: flowColor }}
                                    >
                                        {g.flow}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </section>
    );
}
