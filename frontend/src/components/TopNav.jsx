import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Menu, X, Trophy, MapPin, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ROLES = [
    { id: "fan",       label: "Fan",       color: "var(--brand)" },
    { id: "volunteer", label: "Volunteer", color: "var(--emerald)" },
    { id: "staff",     label: "Staff",     color: "var(--sky)" },
    { id: "organizer", label: "Organizer", color: "var(--coral)" },
];

const NAV_LINKS = [
    { label: "HQ",          path: "/" },
    { label: "Fan Hub",     path: "/fan" },
    { label: "Ops Centre",  path: "/ops" },
];

function VenueDropdown({ venues, venue, setVenueId }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} className="relative" data-testid="venue-select-wrap">
            <button
                onClick={() => setOpen((o) => !o)}
                data-testid="venue-select"
                aria-label="Select venue"
                aria-haspopup="listbox"
                aria-expanded={open}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono tracking-wide transition-all duration-300 max-w-[200px]"
                style={{
                    background: "rgba(245,184,0,0.07)",
                    border: "1px solid rgba(245,184,0,0.22)",
                    color: "#F5B800",
                }}
            >
                <MapPin size={13} className="flex-shrink-0 opacity-70" />
                <span className="truncate font-semibold text-white/90">{venue?.name || "Select venue"}</span>
                <ChevronDown size={13} className={`flex-shrink-0 transition-transform duration-300 opacity-60 ${open ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.2, type: "spring", bounce: 0 }}
                        role="listbox"
                        className="absolute top-full mt-3 right-0 w-72 glass-strong border rounded-2xl overflow-hidden z-50 py-2 shadow-2xl"
                        style={{ borderColor: "rgba(245,184,0,0.2)", boxShadow: "0 30px 60px rgba(0,0,0,0.85), 0 0 0 1px rgba(245,184,0,0.1)" }}
                    >
                        {/* Dropdown header */}
                        <div className="px-4 py-2 mb-1" style={{ borderBottom: "1px solid rgba(245,184,0,0.1)" }}>
                            <div className="text-[9px] font-mono tracking-widest" style={{ color: "var(--brand)" }}>HOST VENUES · WC26</div>
                        </div>
                        {venues.map((v) => (
                            <button
                                key={v.id}
                                role="option"
                                aria-selected={venue?.id === v.id}
                                onClick={() => { setVenueId(v.id); setOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-xs font-mono tracking-wide transition-colors duration-200 flex items-center gap-3 ${
                                    venue?.id === v.id
                                        ? "text-white"
                                        : "text-white/60 hover:text-white hover:bg-white/05"
                                }`}
                                style={venue?.id === v.id ? { background: "rgba(245,184,0,0.10)", color: "#F5B800" } : {}}
                            >
                                {venue?.id === v.id ? (
                                    <Trophy size={12} className="flex-shrink-0" style={{ color: "var(--brand)" }} />
                                ) : (
                                    <div className="w-3 flex-shrink-0" />
                                )}
                                <span className="truncate flex-1">{v.name}</span>
                                <span className="ml-auto text-white/35 text-[10px] flex-shrink-0 uppercase tracking-widest">{v.city}</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function TopNav({ role, setRole, venue, venues, setVenueId }) {
    const nav = useNavigate();
    const loc = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const activeRole = ROLES.find((r) => r.id === role) || ROLES[0];

    return (
        <div className="sticky top-0 z-50 w-full pointer-events-none">
            {/* Gold top accent line */}
            <div style={{ height: "2px", background: "linear-gradient(90deg, transparent 0%, var(--brand) 30%, var(--emerald) 70%, transparent 100%)", opacity: 0.7 }} />

            <div className="px-4 pt-3 pb-2 w-full max-w-[1600px] mx-auto pointer-events-none">
                <header
                    className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-2.5 shadow-2xl transition-all duration-500"
                    style={{
                        background: "rgba(5, 10, 30, 0.82)",
                        backdropFilter: "blur(40px) saturate(180%)",
                        WebkitBackdropFilter: "blur(40px) saturate(180%)",
                        border: "1px solid rgba(245,184,0,0.15)",
                        borderRadius: "14px",
                        boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,184,0,0.08) inset",
                    }}
                    data-testid="top-nav"
                >
                    {/* Brand */}
                    <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0" data-testid="brand-link">
                        <div
                            className="relative w-9 h-9 flex items-center justify-center overflow-hidden rounded-xl flex-shrink-0"
                            style={{
                                background: "linear-gradient(135deg, rgba(245,184,0,0.20) 0%, rgba(245,184,0,0.06) 100%)",
                                border: "1px solid rgba(245,184,0,0.35)",
                                boxShadow: "0 0 16px rgba(245,184,0,0.15)",
                            }}
                        >
                            <Trophy size={16} style={{ color: "var(--brand)" }} />
                        </div>
                        <div className="leading-none hidden sm:block">
                            <div className="font-display text-[15px] tracking-tight text-white leading-none">
                                WC26<span style={{ color: "var(--brand)" }}>·</span>COMMAND
                            </div>
                            <div className="text-[9px] font-mono tracking-widest mt-0.5" style={{ color: "var(--text-muted)" }}>FIFA WORLD CUP 2026</div>
                        </div>
                    </Link>

                    {/* Nav links — desktop */}
                    <nav
                        className="hidden lg:flex items-center gap-1 px-1.5 py-1 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                        aria-label="Primary"
                    >
                        {NAV_LINKS.map((link) => {
                            const active = loc.pathname === link.path;
                            return (
                                <button
                                    key={link.path}
                                    data-testid={`nav-${link.label.toLowerCase().replace(/\s/g, "-")}`}
                                    onClick={() => nav(link.path)}
                                    className={`relative px-4 py-1.5 text-[11px] font-display tracking-widest uppercase transition-all duration-200 rounded-lg ${
                                        active ? "text-black font-bold" : "text-white/55 hover:text-white"
                                    }`}
                                    style={active ? {
                                        background: "var(--brand)",
                                        boxShadow: "0 0 14px rgba(245,184,0,0.4)",
                                    } : {}}
                                >
                                    <span className="relative z-10">{link.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Right side controls */}
                    <div className="flex items-center gap-2">
                        {/* Live status pill */}
                        <div
                            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                            style={{ background: "rgba(0,196,140,0.10)", border: "1px solid rgba(0,196,140,0.25)" }}
                        >
                            <span className="live-dot" aria-hidden="true" />
                            <span className="text-[9px] font-mono tracking-widest" style={{ color: "var(--emerald)" }}>LIVE</span>
                        </div>

                        {/* Venue dropdown */}
                        {venues?.length > 0 && (
                            <VenueDropdown venues={venues} venue={venue} setVenueId={setVenueId} />
                        )}

                        {/* Role switcher */}
                        <div
                            className="hidden md:flex items-center rounded-xl overflow-hidden p-0.5 gap-0.5"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
                            role="radiogroup"
                            aria-label="Role"
                        >
                            {ROLES.map((r) => (
                                <button
                                    key={r.id}
                                    role="radio"
                                    aria-checked={role === r.id}
                                    data-testid={`role-switch-${r.id}`}
                                    onClick={() => { setRole(r.id); nav(r.id === "fan" || r.id === "volunteer" ? "/fan" : "/ops"); }}
                                    className={`relative px-2.5 py-1.5 text-[10px] font-display tracking-wider uppercase rounded-lg transition-all duration-300 ${
                                        role === r.id ? "text-black font-bold" : "text-white/45 hover:text-white/80"
                                    }`}
                                    style={role === r.id ? { background: r.color, boxShadow: `0 0 12px ${r.color}55` } : {}}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>

                        {/* Mobile menu toggle */}
                        <button
                            className="lg:hidden btn-ghost btn !px-2.5 !py-2 !rounded-xl"
                            style={{ border: "1px solid rgba(245,184,0,0.2)", background: "rgba(245,184,0,0.06)" }}
                            onClick={() => setMobileOpen((o) => !o)}
                            aria-label="Toggle menu"
                        >
                            {mobileOpen ? <X size={17} style={{ color: "var(--brand)" }} /> : <Menu size={17} style={{ color: "var(--brand)" }} />}
                        </button>
                    </div>
                </header>

                {/* Mobile menu */}
                <AnimatePresence>
                    {mobileOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -12, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -12, scale: 0.97 }}
                            transition={{ duration: 0.25, type: "spring", bounce: 0 }}
                            className="absolute top-20 left-4 right-4 z-40 p-4 rounded-2xl shadow-2xl pointer-events-auto"
                            style={{ background: "rgba(5,10,30,0.97)", border: "1px solid rgba(245,184,0,0.18)", boxShadow: "0 24px 64px rgba(0,0,0,0.85)" }}
                        >
                            {/* Nav section */}
                            <div className="text-[9px] font-mono tracking-widest px-1 mb-2" style={{ color: "var(--brand)" }}>NAVIGATE</div>
                            <div className="flex flex-col gap-1 mb-4">
                                {NAV_LINKS.map((link) => (
                                    <button
                                        key={link.path}
                                        onClick={() => { nav(link.path); setMobileOpen(false); }}
                                        className={`text-left px-4 py-3 rounded-xl font-display uppercase tracking-wide text-sm transition-all ${
                                            loc.pathname === link.path ? "text-black font-bold" : "text-white/60 hover:text-white hover:bg-white/05"
                                        }`}
                                        style={loc.pathname === link.path ? { background: "var(--brand)", boxShadow: "0 0 16px rgba(245,184,0,0.3)" } : {}}
                                    >
                                        {link.label}
                                    </button>
                                ))}
                            </div>
                            <div className="gold-line my-3" />
                            <div className="text-[9px] font-mono tracking-widest px-1 mb-2" style={{ color: "var(--text-muted)" }}>SWITCH ROLE</div>
                            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Role">
                                {ROLES.map((r) => (
                                    <button
                                        key={r.id}
                                        role="radio"
                                        aria-checked={role === r.id}
                                        data-testid={`role-switch-${r.id}`}
                                        onClick={() => { setRole(r.id); nav(r.id === "fan" || r.id === "volunteer" ? "/fan" : "/ops"); setMobileOpen(false); }}
                                        className="px-4 py-3 rounded-xl text-xs font-display tracking-wider uppercase transition-all"
                                        style={role === r.id
                                            ? { background: `${r.color}22`, color: r.color, border: `1px solid ${r.color}44` }
                                            : { background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.09)" }
                                        }
                                    >
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
