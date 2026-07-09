import { useState } from "react";
import { accessibilityRoute } from "../lib/api";
import { Accessibility, Ear, Eye, Dog, Loader2, Volume2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NEEDS = [
    { id: "wheelchair",       label: "Wheelchair",    icon: Accessibility },
    { id: "hearing loop",     label: "Hearing loop",  icon: Ear },
    { id: "low vision",       label: "Low vision",    icon: Eye },
    { id: "guide dog",        label: "Guide dog",     icon: Dog },
    { id: "sensory-friendly", label: "Sensory quiet", icon: Volume2 },
];

export default function AccessibilityPlanner({ venue, language = "English" }) {
    const [entry, setEntry] = useState("A");
    const [seat, setSeat] = useState("112");
    const [needs, setNeeds] = useState(["wheelchair"]);
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [speaking, setSpeaking] = useState(false);

    const toggle = (id) => setNeeds((n) => (n.includes(id) ? n.filter((x) => x !== id) : [...n, id]));

    const speak = () => {
        if (!plan || !("speechSynthesis" in window)) return;
        
        if (speaking) {
            window.speechSynthesis.cancel();
            setSpeaking(false);
            return;
        }

        const u = new SpeechSynthesisUtterance(plan.route);
        u.onend = () => setSpeaking(false);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
        setSpeaking(true);
    };

    const run = async (e) => {
        e?.preventDefault();
        if (!venue) return;
        setLoading(true);
        setErr(null);
        setPlan(null);
        try {
            const res = await accessibilityRoute({
                venue_id: venue.id,
                entry_gate: entry,
                seat_section: seat,
                needs,
                language,
            });
            setPlan(res);
        } catch (e2) {
            setErr(e2?.response?.data?.detail || e2.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section data-testid="accessibility-panel" className="glass border border-white/10 rounded-2xl p-6 h-full flex flex-col">
            {/* Header */}
            <header className="flex items-center gap-3 mb-6 flex-shrink-0">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,214,0,0.15)", border: "1px solid rgba(255,214,0,0.3)", boxShadow: "0 0 20px rgba(255,214,0,0.15)" }}>
                    <Accessibility size={20} className="text-[#ffd600]" />
                </div>
                <div>
                    <h3 className="font-display text-lg leading-none text-white">Accessibility Routing</h3>
                    <p className="text-[10px] font-mono text-white/40 tracking-wider mt-0.5">STEP-FREE · SENSORY · HEARING LOOP</p>
                </div>
            </header>

            <form onSubmit={run} className="space-y-5 flex-shrink-0">
                {/* Inputs */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[11px] font-mono uppercase tracking-widest text-white/50 mb-2">
                            Entry Gate
                        </label>
                        <input
                            className="input !rounded-xl !py-3 font-display uppercase tracking-wider text-center"
                            value={entry}
                            onChange={(e) => setEntry(e.target.value)}
                            data-testid="a11y-gate"
                            aria-label="Entry gate"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-mono uppercase tracking-widest text-white/50 mb-2">
                            Seat Section
                        </label>
                        <input
                            className="input !rounded-xl !py-3 font-display uppercase tracking-wider text-center"
                            value={seat}
                            onChange={(e) => setSeat(e.target.value)}
                            data-testid="a11y-seat"
                            aria-label="Seat section"
                            required
                        />
                    </div>
                </div>

                {/* Needs */}
                <div>
                    <label className="block text-[11px] font-mono uppercase tracking-widest text-white/50 mb-2">
                        Requirements
                    </label>
                    <div className="flex flex-wrap gap-2" data-testid="a11y-needs">
                        {NEEDS.map(({ id, label, icon: I }) => {
                            const active = needs.includes(id);
                            return (
                                <button
                                    type="button"
                                    key={id}
                                    onClick={() => toggle(id)}
                                    aria-pressed={active}
                                    data-testid={`a11y-need-${id}`}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-display uppercase tracking-wide transition-all duration-200 border"
                                    style={active
                                        ? { background: "rgba(255,214,0,0.15)", border: "1px solid rgba(255,214,0,0.4)", color: "#ffd600", boxShadow: "0 0 10px rgba(255,214,0,0.1)" }
                                        : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }
                                    }
                                >
                                    <I size={15} />
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    className="btn w-full !py-3.5 !rounded-xl !text-sm flex items-center justify-center gap-2 transition-all duration-300"
                    disabled={loading || !venue || needs.length === 0}
                    data-testid="a11y-run"
                    style={{
                        background: "linear-gradient(90deg, #d4a700, #ffc800)",
                        color: "#000",
                        boxShadow: "0 0 20px rgba(255,214,0,0.4)",
                        border: "none"
                    }}
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                    Generate Route
                </button>
            </form>

            <AnimatePresence>
                {err && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-4 p-4 rounded-xl border border-[#ff1e56]/30 bg-[#ff1e56]/10 text-[#ff1e56] text-sm flex-shrink-0"
                        role="alert"
                    >
                        {err}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1 min-h-0 mt-5 flex flex-col">
                <AnimatePresence mode="wait">
                    {loading && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex flex-col gap-3"
                        >
                            <div className="h-8 w-40 skeleton rounded-lg mb-2" />
                            {[1, 2, 3].map(i => <div key={i} className="h-12 skeleton rounded-xl" />)}
                        </motion.div>
                    )}

                    {plan && !loading && (
                        <motion.div
                            key="plan"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex-1 relative rounded-xl border border-white/08 overflow-hidden flex flex-col"
                            style={{ background: "rgba(255,214,0,0.03)", boxShadow: "inset 0 0 40px rgba(255,214,0,0.02)" }}
                            data-testid="a11y-plan"
                        >
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ffd600] to-transparent opacity-40" />
                            
                            <div className="flex items-center justify-between p-4 border-b border-white/05" style={{ background: "rgba(255,214,0,0.04)" }}>
                                <div className="text-[10px] font-mono tracking-widest text-[#ffd600] font-bold">AI ROUTE PLAN</div>
                                <button
                                    onClick={speak}
                                    className="btn btn-ghost !px-3 !py-1.5 !text-[10px] !rounded-lg"
                                    data-testid="a11y-tts"
                                    aria-label="Read route aloud"
                                >
                                    {speaking ? <Loader2 size={13} className="animate-spin text-[#ffd600]" /> : <Volume2 size={13} />}
                                    {speaking ? "Speaking..." : "Read Aloud"}
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                                <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-white/90 m-0">
                                    {plan.route}
                                </pre>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}
