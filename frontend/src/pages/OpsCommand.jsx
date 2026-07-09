import { useState } from "react";
import { motion } from "framer-motion";
import CrowdHeatmap from "../components/CrowdHeatmap";
import IncidentBoard from "../components/IncidentBoard";
import OpsInsights from "../components/OpsInsights";
import SustainabilityPanel from "../components/SustainabilityPanel";
import ScoreboardTicker from "../components/ScoreboardTicker";
import { Trophy, MapPin } from "lucide-react";

export default function OpsCommand({ role, venue, matches, incidents, refreshIncidents }) {
    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <div data-testid="ops-command" className="min-h-screen">
            <ScoreboardTicker matches={matches} incidents={incidents} venue={venue} />

            <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6">

                {/* Command header */}
                <header
                    className="relative rounded-2xl mb-6 p-6 md:p-8"
                    style={{
                        background: "var(--bg-surface)",
                        border: "1px solid rgba(255,255,255,0.09)",
                        borderLeft: "3px solid var(--brand)",
                    }}
                >
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div
                                className="hidden sm:flex w-11 h-11 items-center justify-center rounded-xl flex-shrink-0"
                                style={{ background: "rgba(245,184,0,0.10)", border: "1px solid rgba(245,184,0,0.22)" }}
                            >
                                <Trophy size={20} style={{ color: "var(--brand)" }} />
                            </div>
                            <div>
                                <div className="text-[10px] font-mono tracking-widest mb-1" style={{ color: "var(--brand)" }}>
                                    OPS CENTRE · {role.toUpperCase()}
                                </div>
                                <h1 className="font-display text-2xl md:text-3xl leading-none text-white">
                                    {venue ? venue.name : "Select a venue"}
                                </h1>
                                {venue && (
                                    <div className="flex items-center gap-2 mt-1.5 text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
                                        <MapPin size={12} />
                                        {venue.city} · {venue.country} · Cap {venue.capacity.toLocaleString()}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                                style={{ background: "rgba(0,196,140,0.09)", border: "1px solid rgba(0,196,140,0.22)" }}
                            >
                                <span className="live-dot" aria-hidden="true" />
                                <span className="text-[10px] font-mono tracking-widest" style={{ color: "var(--emerald)" }}>LIVE OPS</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dashboard grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                    {/* Crowd Heatmap — sky accent, 8 cols */}
                    <motion.div
                        className="lg:col-span-8"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.05 }}
                    >
                        <div className="panel panel-sky glow-border-sky h-full">
                            <CrowdHeatmap venue={venue} />
                        </div>
                    </motion.div>

                    {/* Ops Insights — gold accent, 4 cols */}
                    <motion.div
                        className="lg:col-span-4"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                    >
                        <div className="panel panel-brand glow-border-brand h-full">
                            <OpsInsights venue={venue} />
                        </div>
                    </motion.div>

                    {/* Incident Board — coral accent, 7 cols */}
                    <motion.div
                        className="lg:col-span-7"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.15 }}
                    >
                        <div className="panel panel-coral glow-border-coral h-full">
                            <IncidentBoard
                                venue={venue}
                                refreshKey={refreshKey + (incidents?.length || 0)}
                            />
                        </div>
                    </motion.div>

                    {/* Sustainability — emerald accent, 5 cols */}
                    <motion.div
                        className="lg:col-span-5"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                    >
                        <div className="panel panel-emerald glow-border-emerald h-full">
                            <SustainabilityPanel venue={venue} />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
