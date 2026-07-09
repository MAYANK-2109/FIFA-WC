import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ConciergeChat from "../components/ConciergeChat";
import TransportAdvisor from "../components/TransportAdvisor";
import AccessibilityPlanner from "../components/AccessibilityPlanner";
import IncidentReport from "../components/IncidentReport";
import ScoreboardTicker from "../components/ScoreboardTicker";
import { MessageSquare, Train, Accessibility, AlertTriangle, MapPin, Users } from "lucide-react";

const TABS = [
    { id: "concierge",     label: "Concierge",     Icon: MessageSquare, accent: "#F5B800", desc: "AI multilingual assistant" },
    { id: "transport",     label: "Transport",     Icon: Train,          accent: "#38BDF8", desc: "Route & ETA recommendations" },
    { id: "accessibility", label: "Accessibility", Icon: Accessibility,  accent: "#00C48C", desc: "Step-free routing & zones" },
    { id: "report",        label: "Report Issue",  Icon: AlertTriangle,  accent: "#FF4757", desc: "AI-triaged incident submission" },
];

const panelVariants = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -8 },
};

export default function FanApp({ role, venue, matches, incidents, refreshIncidents }) {
    const [tab, setTab] = useState("concierge");
    const activeTab = TABS.find((t) => t.id === tab) || TABS[0];

    return (
        <div data-testid="fan-app" className="min-h-screen">
            <ScoreboardTicker matches={matches} incidents={incidents} venue={venue} />

            <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6">

                {/* Venue header */}
                <header
                    className="relative rounded-2xl mb-6 p-6 md:p-8"
                    style={{
                        background: "var(--bg-surface)",
                        border: "1px solid rgba(255,255,255,0.09)",
                    }}
                >
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div
                                className="hidden sm:flex w-11 h-11 items-center justify-center rounded-xl flex-shrink-0"
                                style={{ background: "rgba(245,184,0,0.10)", border: "1px solid rgba(245,184,0,0.22)" }}
                            >
                                <Users size={20} style={{ color: "var(--brand)" }} />
                            </div>
                            <div>
                                <div className="text-[10px] font-mono tracking-widest mb-1" style={{ color: "var(--brand)" }}>
                                    FAN HUB · {role.toUpperCase()}
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

                        {/* Active tab badge */}
                        <div
                            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full"
                            style={{
                                background: `${activeTab.accent}12`,
                                border: `1px solid ${activeTab.accent}28`,
                            }}
                        >
                            <activeTab.Icon size={12} style={{ color: activeTab.accent }} />
                            <span className="text-[10px] font-mono tracking-widest" style={{ color: activeTab.accent }}>
                                {activeTab.label.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Horizontal pill-tab navigation */}
                <nav
                    className="flex gap-2 mb-6 overflow-x-auto pb-1"
                    role="tablist"
                    data-testid="fan-tabs"
                    aria-label="Fan app sections"
                    style={{ scrollbarWidth: "none" }}
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
                                className="group relative flex-shrink-0 flex items-center gap-2.5 px-5 py-2.5 rounded-full text-left transition-all duration-300"
                                style={active ? {
                                    background: `${t.accent}18`,
                                    border: `1px solid ${t.accent}40`,
                                    boxShadow: `0 0 16px ${t.accent}18`,
                                    color: t.accent,
                                } : {
                                    background: "rgba(255,255,255,0.04)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    color: "rgba(255,255,255,0.50)",
                                }}
                            >
                                {/* Active underline indicator */}
                                {active && (
                                    <motion.div
                                        layoutId="fan-tab-indicator"
                                        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full"
                                        style={{ background: t.accent, boxShadow: `0 0 8px ${t.accent}` }}
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                                    />
                                )}
                                <t.Icon size={14} />
                                <span className="text-[12px] font-display tracking-wide">{t.label}</span>
                                <span
                                    className="hidden lg:block text-[10px] font-mono opacity-60"
                                    style={{ borderLeft: "1px solid currentColor", paddingLeft: "8px", marginLeft: "2px" }}
                                >
                                    {t.desc}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                {/* Content panel */}
                <div className="w-full">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={tab}
                            variants={panelVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={{ duration: 0.22, ease: "easeOut" }}
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
    );
}
