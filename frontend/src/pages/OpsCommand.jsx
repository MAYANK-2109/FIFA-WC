import { useState } from "react";
import { motion } from "framer-motion";
import CrowdHeatmap from "../components/CrowdHeatmap";
import IncidentBoard from "../components/IncidentBoard";
import OpsInsights from "../components/OpsInsights";
import SustainabilityPanel from "../components/SustainabilityPanel";
import ScoreboardTicker from "../components/ScoreboardTicker";
import { Radio, MapPin, Cpu } from "lucide-react";

export default function OpsCommand({ role, venue, matches, incidents, refreshIncidents }) {
    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <div data-testid="ops-command" className="min-h-screen">
            <ScoreboardTicker matches={matches} incidents={incidents} venue={venue} />

            <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">

                {/* Command header */}
                <header
                    className="relative overflow-hidden rounded-2xl mb-6 border border-white/08 p-6 md:p-8"
                    style={{ background: "linear-gradient(135deg, rgba(255,30,86,0.06) 0%, rgba(14,14,22,0.95) 40%, rgba(0,229,255,0.05) 100%)" }}
                >
                    <div className="absolute inset-0 bg-mesh opacity-30 rounded-2xl" aria-hidden="true" />
                    {/* Scan-line effect */}
                    <div className="absolute inset-0 overflow-hidden rounded-2xl scan-line" aria-hidden="true" />
                    <div className="relative flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="hidden sm:flex w-12 h-12 items-center justify-center rounded-xl border border-[#ff1e56]/30 flex-shrink-0"
                                style={{ background: "rgba(255,30,86,0.12)" }}>
                                <Cpu size={22} className="text-[#ff1e56]" />
                            </div>
                            <div>
                                <div className="text-[10px] font-mono tracking-widest text-[#ff1e56] mb-1">
                                    OPS COMMAND · {role.toUpperCase()}
                                </div>
                                <h1 className="font-display text-3xl md:text-4xl leading-none text-white">
                                    {venue ? venue.name : "Select a venue"}
                                </h1>
                                {venue && (
                                    <div className="flex items-center gap-2 mt-2 text-white/50 text-sm font-mono">
                                        <MapPin size={13} />
                                        {venue.city} · {venue.country} · Cap {venue.capacity.toLocaleString()}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 glass border border-[#ccff00]/20 px-3 py-1.5 rounded-full">
                            <span className="live-dot" aria-hidden="true" />
                            <span className="text-[10px] font-mono tracking-widest text-[#ccff00]">LIVE OPS</span>
                        </div>
                    </div>
                </header>

                {/* Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

                    {/* Crowd Heatmap — blue accent */}
                    <motion.div
                        className="lg:col-span-8"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.05 }}
                    >
                        <div className="panel panel-blue glow-border-blue h-full">
                            <CrowdHeatmap venue={venue} />
                        </div>
                    </motion.div>

                    {/* Ops Insights — volt accent */}
                    <motion.div
                        className="lg:col-span-4"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                    >
                        <div className="panel panel-volt glow-border-volt h-full">
                            <OpsInsights venue={venue} />
                        </div>
                    </motion.div>

                    {/* Incident Board — brand accent */}
                    <motion.div
                        className="lg:col-span-7"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.15 }}
                    >
                        <div className="panel panel-brand glow-border-brand h-full">
                            <IncidentBoard
                                venue={venue}
                                refreshKey={refreshKey + (incidents?.length || 0)}
                            />
                        </div>
                    </motion.div>

                    {/* Sustainability — volt accent */}
                    <motion.div
                        className="lg:col-span-5"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                    >
                        <div className="panel panel-volt glow-border-volt h-full">
                            <SustainabilityPanel venue={venue} />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
