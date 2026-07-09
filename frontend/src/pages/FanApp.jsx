import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ConciergeChat from "../components/ConciergeChat";
import TransportAdvisor from "../components/TransportAdvisor";
import AccessibilityPlanner from "../components/AccessibilityPlanner";
import IncidentReport from "../components/IncidentReport";
import ScoreboardTicker from "../components/ScoreboardTicker";
import { MessageSquare, Train, Accessibility, AlertTriangle, MapPin, Users } from "lucide-react";

const TABS = [
    { id: "concierge",     label: "Concierge",     Icon: MessageSquare, accent: "#ccff00", desc: "AI multilingual assistant" },
    { id: "transport",     label: "Transport",     Icon: Train,          accent: "#00e5ff", desc: "Route & ETA recommendations" },
    { id: "accessibility", label: "Accessibility", Icon: Accessibility,  accent: "#ffd600", desc: "Step-free routing & zones" },
    { id: "report",        label: "Report Issue",  Icon: AlertTriangle,  accent: "#ff1e56", desc: "AI-triaged incident submission" },
];

const panelVariants = {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit:    { opacity: 0, x: -16 },
};

export default function FanApp({ role, venue, matches, incidents, refreshIncidents }) {
    const [tab, setTab] = useState("concierge");
    const activeTab = TABS.find((t) => t.id === tab) || TABS[0];

    return (
        <div data-testid="fan-app" className="min-h-screen">
            <ScoreboardTicker matches={matches} incidents={incidents} venue={venue} />

            <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">

                {/* Venue header */}
                <header className="relative overflow-hidden rounded-2xl mb-6 border border-white/08 p-6 md:p-8"
                    style={{ background: "linear-gradient(135deg, rgba(255,30,86,0.08) 0%, rgba(14,14,22,0.9) 50%, rgba(0,229,255,0.05) 100%)" }}
                >
                    {/* Mesh */}
                    <div className="absolute inset-0 bg-mesh opacity-40 rounded-2xl" aria-hidden="true" />
                    <div className="relative">
                        <div className="flex items-start gap-4">
                            <div className="hidden sm:flex w-12 h-12 items-center justify-center rounded-xl border border-white/15 flex-shrink-0"
                                style={{ background: "rgba(255,30,86,0.12)" }}>
                                <Users size={22} className="text-[#ff1e56]" />
                            </div>
                            <div>
                                <div className="text-[10px] font-mono tracking-widest text-[#ccff00] mb-1">
                                    FAN EXPERIENCE · {role.toUpperCase()}
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
                    </div>
                </header>

                {/* Main layout: sidebar + content */}
                <div className="flex flex-col lg:flex-row gap-5">

                    {/* Sidebar nav */}
                    <nav
                        className="lg:w-56 xl:w-64 flex-shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible"
                        role="tablist"
                        data-testid="fan-tabs"
                        aria-label="Fan app sections"
                    >
                        {TABS.map((t) => {
                            const active = tab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    role="tab"
                                    aria-selected={active}
                                    data-testid={`fan-tab-${t.id}`}
                                    onClick={() => setTab(t.id)}
                                    className={`group relative flex-shrink-0 lg:flex-shrink flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 border ${
                                        active
                                            ? "border-white/15 text-white"
                                            : "border-transparent text-white/50 hover:text-white/80 hover:border-white/08 hover:bg-white/03"
                                    }`}
                                    style={active ? {
                                        background: `${t.accent}10`,
                                        borderColor: `${t.accent}30`,
                                        boxShadow: `0 0 20px ${t.accent}10`,
                                    } : {}}
                                >
                                    {/* Active indicator */}
                                    {active && (
                                        <motion.div
                                            layoutId="fan-tab-indicator"
                                            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                                            style={{ background: t.accent, boxShadow: `0 0 8px ${t.accent}` }}
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                                        />
                                    )}
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                                        style={active
                                            ? { background: `${t.accent}20`, border: `1px solid ${t.accent}40` }
                                            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }
                                        }
                                    >
                                        <t.Icon size={15} style={active ? { color: t.accent } : { color: "rgba(255,255,255,0.4)" }} />
                                    </div>
                                    <div className="hidden lg:block">
                                        <div className="text-[12px] font-display tracking-wide leading-none">{t.label}</div>
                                        <div className="text-[10px] font-mono text-white/40 mt-0.5">{t.desc}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Content panel */}
                    <div className="flex-1 min-w-0">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={tab}
                                variants={panelVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.25, ease: "easeOut" }}
                            >
                                {tab === "concierge"     && <ConciergeChat role={role} venue={venue} />}
                                {tab === "transport"     && <TransportAdvisor venue={venue} />}
                                {tab === "accessibility" && <AccessibilityPlanner venue={venue} />}
                                {tab === "report"        && <IncidentReport venue={venue} role={role} onCreated={refreshIncidents} />}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
