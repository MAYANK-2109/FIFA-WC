import { useState } from "react";
import { createIncident } from "../lib/api";
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ZONES = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export default function IncidentReport({ venue, role = "fan", onCreated }) {
    const [desc, setDesc] = useState("");
    const [zone, setZone] = useState("N");
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [err, setErr] = useState(null);

    const submit = async (e) => {
        e.preventDefault();
        if (!venue || !desc.trim()) return;
        setSubmitting(true);
        setErr(null);
        setResult(null);
        try {
            const r = await createIncident({
                venue_id: venue.id,
                zone,
                reporter_role: role,
                description: desc.trim(),
            });
            setResult(r);
            setDesc("");
            onCreated?.(r);
        } catch (e2) {
            setErr(e2?.response?.data?.detail || e2.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section data-testid="incident-report" className="glass border border-white/10 rounded-2xl p-6">
            {/* Header */}
            <header className="flex items-center gap-3 mb-6">
                <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,30,86,0.15)", border: "1px solid rgba(255,30,86,0.35)", boxShadow: "0 0 20px rgba(255,30,86,0.15)" }}
                >
                    <AlertTriangle size={20} className="text-[#ff1e56]" />
                </div>
                <div>
                    <h3 className="font-display text-lg leading-none text-white">Report an Issue</h3>
                    <p className="text-[10px] font-mono text-white/40 tracking-wider mt-0.5">AI TRIAGE · AUTO-ROUTE TO OPS</p>
                </div>
            </header>

            <form onSubmit={submit} className="space-y-4">
                {/* Zone selector */}
                <div>
                    <label className="block text-[11px] font-mono uppercase tracking-widest text-white/50 mb-2">
                        Stadium Zone
                    </label>
                    <div className="grid grid-cols-8 gap-1.5">
                        {ZONES.map((z) => (
                            <button
                                key={z}
                                type="button"
                                onClick={() => setZone(z)}
                                className="py-2 rounded-lg text-[11px] font-mono font-bold transition-all duration-150"
                                style={zone === z
                                    ? { background: "rgba(255,30,86,0.2)", border: "1px solid rgba(255,30,86,0.5)", color: "#ff1e56", boxShadow: "0 0 10px rgba(255,30,86,0.2)" }
                                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }
                                }
                                aria-pressed={zone === z}
                            >
                                {z}
                            </button>
                        ))}
                    </div>
                    {/* Hidden select for test compatibility */}
                    <select
                        value={zone}
                        onChange={(e) => setZone(e.target.value)}
                        className="sr-only"
                        data-testid="incident-zone"
                        aria-label="Zone"
                    >
                        {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                    </select>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-[11px] font-mono uppercase tracking-widest text-white/50 mb-2">
                        Describe the Situation
                    </label>
                    <textarea
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        rows={4}
                        className="input !rounded-xl"
                        placeholder="e.g. Woman fainted near section 118 concourse…"
                        data-testid="incident-description"
                        aria-label="Incident description"
                        required
                        maxLength={2000}
                    />
                    <div className="text-[10px] font-mono text-white/30 mt-1 text-right">{desc.length}/2000</div>
                </div>

                {/* Submit */}
                <button
                    className="btn btn-primary w-full !py-3.5 !rounded-xl !text-sm"
                    disabled={submitting || !venue}
                    data-testid="incident-submit"
                >
                    {submitting
                        ? <><Loader2 size={16} className="animate-spin" /> Routing to Ops…</>
                        : <><AlertTriangle size={16} /> Report to Ops Command</>
                    }
                </button>
            </form>

            {/* Error */}
            <AnimatePresence>
                {err && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-4 p-3 rounded-xl border border-[#ff1e56]/30 bg-[#ff1e56]/10 text-[#ff1e56] text-sm"
                        role="alert"
                    >
                        {err}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Result */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-5 p-4 rounded-xl border border-[#ccff00]/30 bg-[#ccff00]/08"
                        data-testid="incident-result"
                    >
                        <div className="flex items-center gap-2 text-[#ccff00] text-[10px] font-mono tracking-widest mb-3">
                            <CheckCircle2 size={14} />
                            ROUTED TO {result.department}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="p-2.5 rounded-lg bg-white/04 border border-white/08">
                                <div className="text-[9px] font-mono text-white/40 tracking-widest mb-1">CATEGORY</div>
                                <div className="text-white/90">{result.category}</div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-white/04 border border-white/08">
                                <div className="text-[9px] font-mono text-white/40 tracking-widest mb-1">SEVERITY</div>
                                <div style={{ color: result.severity === "CRITICAL" ? "#ff1e56" : result.severity === "HIGH" ? "#ffd600" : "#ccff00" }}>
                                    {result.severity}
                                </div>
                            </div>
                        </div>
                        <p className="mt-3 text-sm text-white/75 leading-relaxed">{result.recommended_action}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
