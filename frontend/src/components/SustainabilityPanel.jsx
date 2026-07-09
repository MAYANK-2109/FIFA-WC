import { useEffect, useState } from "react";
import { sustainabilityInsights } from "../lib/api";
import { Leaf, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const Bar = ({ value, goal = 100, tone = "#ccff00", label, unit = "%", testId, delay }) => {
    const pct = Math.min(100, Math.round((value / (goal || 100)) * 100));
    
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay }}
            className="p-3 rounded-lg border border-white/08"
            style={{ background: "rgba(255,255,255,0.03)" }}
            data-testid={testId}
        >
            <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-white/50 mb-2">
                <span>{label}</span>
                <span className="font-bold" style={{ color: tone }}>
                    {typeof value === "number" ? value.toLocaleString() : value}
                    {unit}
                </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden bg-white/10" style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)" }}>
                <motion.div
                    className="h-full rounded-full"
                    style={{ background: tone, boxShadow: `0 0 10px ${tone}88` }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, delay: delay + 0.2, ease: "easeOut" }}
                />
            </div>
        </motion.div>
    );
};

export default function SustainabilityPanel({ venue }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (!venue?.id) return undefined;
        let alive = true;
        setLoading(true);
        setErr(null);
        sustainabilityInsights(venue.id)
            .then((r) => alive && setData(r))
            .catch((e) => alive && setErr(e?.response?.data?.detail || e.message))
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, [venue?.id]);

    const k = data?.kpis;

    return (
        <section data-testid="sustainability-panel" className="flex flex-col h-full p-5">
            {/* Header */}
            <header className="flex items-center gap-3 mb-5 flex-shrink-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(204,255,0,0.15)", border: "1px solid rgba(204,255,0,0.3)" }}>
                    <Leaf size={17} className="text-[#ccff00]" />
                </div>
                <div>
                    <h3 className="font-display text-base leading-none text-white">Sustainability</h3>
                    <p className="text-[10px] font-mono text-white/40 tracking-wider mt-0.5">HOURLY · AI-NARRATED</p>
                </div>
            </header>

            {loading ? (
                <div className="flex-1 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3 mb-2">
                        {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 skeleton rounded-lg" />)}
                    </div>
                    <div className="flex-1 skeleton rounded-lg min-h-[100px]" />
                </div>
            ) : err ? (
                <div className="p-4 rounded-xl border border-[#ff1e56]/30 bg-[#ff1e56]/10 text-[#ff1e56] text-sm" role="alert" data-testid="sust-err">
                    {err}
                </div>
            ) : k ? (
                <div className="flex-1 flex flex-col min-h-0">
                    {/* KPIs */}
                    <div className="grid grid-cols-2 gap-3 mb-4 flex-shrink-0">
                        <Bar delay={0.0} label="WASTE DIVERTED" value={k.waste_diversion_pct} goal={k.goal_waste_diversion_pct} tone="#ccff00" testId="kpi-waste" />
                        <Bar delay={0.1} label="RENEWABLES" value={k.renewable_pct} goal={100} tone="#00e5ff" testId="kpi-renewable" />
                        <Bar delay={0.2} label="ENERGY" value={k.energy_kwh} goal={100000} tone="#ffd600" unit=" kWh" testId="kpi-energy" />
                        <Bar delay={0.3} label="CARBON" value={k.carbon_kg_co2e} goal={60000} tone="#ff1e56" unit=" kg" testId="kpi-carbon" />
                    </div>
                    
                    {/* Narrative */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                        className="flex-1 relative rounded-xl border border-white/08 overflow-hidden flex flex-col"
                        style={{ background: "rgba(204,255,0,0.02)" }}
                    >
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ccff00] to-transparent opacity-20" />
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <pre className="text-[13px] whitespace-pre-wrap font-sans text-white/70 leading-relaxed m-0" data-testid="sust-narrative">
                                {data.narrative}
                            </pre>
                        </div>
                    </motion.div>
                </div>
            ) : null}
        </section>
    );
}
