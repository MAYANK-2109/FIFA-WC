import { useEffect, useState } from "react";
import { opsInsights } from "../lib/api";
import { Brain, Loader2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OpsInsights({ venue, autoLoad = true }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);

    const load = async () => {
        if (!venue) return;
        setLoading(true);
        setErr(null);
        try {
            setData(await opsInsights(venue.id));
        } catch (e) {
            setErr(e?.response?.data?.detail || e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (autoLoad) load();
    }, [venue?.id, autoLoad]);

    return (
        <section data-testid="ops-insights" className="flex flex-col h-full p-5">
            {/* Header */}
            <header className="flex items-center gap-3 mb-5 flex-shrink-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(204,255,0,0.15)", border: "1px solid rgba(204,255,0,0.3)" }}>
                    <Brain size={17} className="text-[#ccff00]" />
                </div>
                <div>
                    <h3 className="font-display text-base leading-none text-white">AI Briefing</h3>
                    <p className="text-[10px] font-mono text-white/40 tracking-wider mt-0.5">
                        GEMINI 3 FLASH
                    </p>
                </div>
                <button
                    className="btn btn-ghost !px-2.5 !py-1.5 !text-[10px] !rounded-lg ml-auto border-white/10"
                    onClick={load}
                    disabled={loading}
                    data-testid="ops-refresh"
                >
                    {loading ? <Loader2 size={12} className="animate-spin text-[#ccff00]" /> : <RefreshCw size={12} />}
                    SYNC
                </button>
            </header>

            {err && (
                <div className="p-4 rounded-xl border border-[#ff1e56]/30 bg-[#ff1e56]/10 text-[#ff1e56] text-sm mb-3" role="alert">
                    {err}
                </div>
            )}

            <div className="flex-1 flex flex-col min-h-0">
                <AnimatePresence mode="wait">
                    {loading && !data ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex flex-col gap-4"
                        >
                            <div className="flex-1 skeleton rounded-xl min-h-[120px]" />
                            <div className="grid grid-cols-2 gap-3 h-20">
                                <div className="skeleton rounded-lg h-full" />
                                <div className="skeleton rounded-lg h-full" />
                            </div>
                        </motion.div>
                    ) : data ? (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex-1 flex flex-col gap-4 min-h-0"
                        >
                            {/* Briefing Feed */}
                            <div
                                className="flex-1 relative rounded-xl border border-white/08 overflow-hidden flex flex-col"
                                style={{ background: "rgba(255,255,255,0.02)" }}
                            >
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                    <pre
                                        className="text-[13px] whitespace-pre-wrap font-sans text-white/80 leading-relaxed m-0"
                                        data-testid="ops-briefing"
                                    >
                                        {data.briefing}
                                    </pre>
                                </div>
                            </div>

                            {/* Summary KPIs */}
                            <div className="grid grid-cols-2 gap-3 flex-shrink-0">
                                <div
                                    className="p-3 rounded-lg border border-[#ff1e56]/20 relative overflow-hidden"
                                    style={{ background: "rgba(255,30,86,0.04)" }}
                                >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-[#ff1e56]" />
                                    <div className="text-[9px] font-mono text-white/50 tracking-widest mb-1 ml-1">HOT ZONES</div>
                                    <div className="font-mono text-xs text-white/90 ml-1">
                                        {data.hot_zones.map((z) => `${z.zone} (${z.density_pct}%)`).join(" · ")}
                                    </div>
                                </div>
                                
                                <div
                                    className="p-3 rounded-lg border border-[#ccff00]/20 relative overflow-hidden flex flex-col justify-center"
                                    style={{ background: "rgba(204,255,0,0.04)" }}
                                >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-[#ccff00]" />
                                    <div className="flex items-end gap-3 ml-1">
                                        <div className="text-[9px] font-mono text-white/50 tracking-widest leading-none mb-1">OPEN<br/>INCIDENTS</div>
                                        <div className="font-mono text-2xl leading-none text-[#ccff00] font-bold" data-testid="open-incidents-kpi">
                                            {data.open_incidents}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>
        </section>
    );
}
