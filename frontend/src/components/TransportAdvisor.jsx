import { useState } from "react";
import { transportRecommend } from "../lib/api";
import { Bus, Loader2, Sparkles, Accessibility as AccIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const modeColor = (m) =>
    m.includes("Metro") ? { color: "#00e5ff", bg: "rgba(0,229,255,0.1)", border: "rgba(0,229,255,0.3)" }
    : m.includes("Shuttle") ? { color: "#ccff00", bg: "rgba(204,255,0,0.1)", border: "rgba(204,255,0,0.3)" }
    : m.includes("Rideshare") ? { color: "#ff1e56", bg: "rgba(255,30,86,0.1)", border: "rgba(255,30,86,0.3)" }
    : m.includes("Bike") ? { color: "#ffd600", bg: "rgba(255,214,0,0.1)", border: "rgba(255,214,0,0.3)" }
    : { color: "rgba(255,255,255,0.7)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" };

export default function TransportAdvisor({ venue, language = "English" }) {
    const [origin, setOrigin] = useState("Times Square");
    const [accessible, setAccessible] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);

    const run = async (e) => {
        e?.preventDefault();
        if (!venue) return;
        setLoading(true);
        setErr(null);
        try {
            const res = await transportRecommend({
                venue_id: venue.id,
                origin,
                language,
                accessibility: accessible,
            });
            setData(res);
        } catch (e2) {
            setErr(e2?.response?.data?.detail || e2.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section data-testid="transport-panel" className="glass border border-white/10 rounded-2xl p-6 h-full flex flex-col">
            {/* Header */}
            <header className="flex items-center gap-3 mb-6 flex-shrink-0">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(0,229,255,0.15)", border: "1px solid rgba(0,229,255,0.3)", boxShadow: "0 0 20px rgba(0,229,255,0.15)" }}>
                    <Bus size={20} className="text-[#00e5ff]" />
                </div>
                <div>
                    <h3 className="font-display text-lg leading-none text-white">Transport Advisor</h3>
                    <p className="text-[10px] font-mono text-white/40 tracking-wider mt-0.5">AI ROUTING · ETA · CO₂ · COST</p>
                </div>
            </header>

            <form onSubmit={run} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 mb-6 flex-shrink-0">
                <div className="relative">
                    <input
                        className="input !rounded-xl !py-3 !pl-4 w-full"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        placeholder="Your starting point"
                        aria-label="Origin"
                        data-testid="transport-origin"
                        required
                    />
                </div>
                <label
                    className="flex items-center gap-2 px-4 rounded-xl border border-white/10 text-[11px] font-mono uppercase tracking-wide cursor-pointer transition-colors"
                    style={accessible ? { background: "rgba(204,255,0,0.1)", borderColor: "rgba(204,255,0,0.3)", color: "#ccff00" } : { background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.6)" }}
                    data-testid="transport-accessible-wrap"
                >
                    <input
                        type="checkbox"
                        checked={accessible}
                        onChange={(e) => setAccessible(e.target.checked)}
                        className="sr-only"
                        data-testid="transport-accessible"
                        aria-label="Accessibility required"
                    />
                    <AccIcon size={16} /> A11Y
                </label>
                <button
                    type="submit"
                    className="btn btn-primary !py-3 !px-5 !rounded-xl"
                    disabled={loading || !venue}
                    data-testid="transport-run"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Route
                </button>
            </form>

            <AnimatePresence>
                {err && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-4 rounded-xl border border-[#ff1e56]/30 bg-[#ff1e56]/10 text-[#ff1e56] text-sm mb-4 flex-shrink-0"
                        role="alert"
                    >
                        {err}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1 min-h-0 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
                {loading && !data && (
                    <div className="space-y-4">
                        <div className="h-24 skeleton rounded-xl" />
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}
                        </div>
                    </div>
                )}
                <AnimatePresence>
                    {data && !loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col gap-5"
                        >
                            {/* AI Narrative */}
                            <div className="relative rounded-xl border border-white/08 p-5"
                                style={{ background: "rgba(0,229,255,0.03)", boxShadow: "inset 0 0 40px rgba(0,229,255,0.02)" }}
                                data-testid="transport-recommendation"
                            >
                                <div className="absolute top-0 left-5 right-5 h-[1px] bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent opacity-30" />
                                <div className="flex items-center gap-2 text-[#00e5ff] text-[10px] font-mono tracking-widest mb-2">
                                    <Sparkles size={12} /> AI ROUTING SUMMARY
                                </div>
                                <div className="text-sm leading-relaxed text-white/85">
                                    {data.recommendation}
                                </div>
                            </div>

                            {/* Options List */}
                            <div className="flex flex-col gap-2">
                                <div className="text-[10px] font-mono text-white/40 tracking-widest px-1 mb-1">AVAILABLE ROUTES</div>
                                {data.options.map((o, i) => {
                                    const style = modeColor(o.mode);
                                    return (
                                        <motion.div
                                            key={o.mode}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="flex items-center gap-4 p-3 rounded-xl border transition-colors hover:bg-white/[0.02]"
                                            style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
                                        >
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center font-display uppercase tracking-tighter text-xs"
                                                style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.color }}
                                            >
                                                {o.mode.slice(0, 3)}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="font-display text-[13px] tracking-wide text-white truncate">{o.mode}</div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-[10px] font-mono text-white/50">
                                                    <span className="text-white/80">{o.eta_min}m</span>
                                                    <span>${o.cost_usd}</span>
                                                    <span style={{ color: "#ccff00" }}>{o.co2_kg} kg CO₂</span>
                                                </div>
                                            </div>

                                            {o.accessible && (
                                                <div className="flex-shrink-0 px-2 py-1 rounded-md text-[9px] font-mono tracking-widest text-[#ccff00] border border-[#ccff00]/30 bg-[#ccff00]/10">
                                                    A11Y
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}
