import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Radio, ChevronDown, Menu, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ROLES = [
    { id: "fan",       label: "Fan",       color: "var(--brand)" },
    { id: "volunteer", label: "Volunteer", color: "var(--volt)" },
    { id: "staff",     label: "Staff",     color: "var(--stadium-blue)" },
    { id: "organizer", label: "Organizer", color: "var(--alert-yellow)" },
];

const NAV_LINKS = [
    { label: "Home",           path: "/" },
    { label: "Fan Experience", path: "/fan" },
    { label: "Ops Command",    path: "/ops" },
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
                className="flex items-center gap-2 glass border border-white/10 px-4 py-2 rounded-xl text-xs font-mono tracking-wide text-white/90 hover:border-white/30 transition-all duration-300 max-w-[200px]"
                style={{ background: "rgba(255,255,255,0.03)" }}
            >
                <span className="truncate font-semibold">{venue?.name || "Select venue"}</span>
                <ChevronDown size={14} className={`flex-shrink-0 transition-transform duration-300 text-white/50 ${open ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.2, type: "spring", bounce: 0 }}
                        role="listbox"
                        className="absolute top-full mt-3 right-0 w-72 glass-strong border border-white/15 rounded-2xl overflow-hidden z-50 py-1.5 shadow-2xl"
                        style={{ boxShadow: "0 30px 60px rgba(0,0,0,0.8)" }}
                    >
                        {venues.map((v) => (
                            <button
                                key={v.id}
                                role="option"
                                aria-selected={venue?.id === v.id}
                                onClick={() => { setVenueId(v.id); setOpen(false); }}
                                className={`w-full text-left px-5 py-3 text-xs font-mono tracking-wide transition-colors duration-200 flex items-center gap-3 ${
                                    venue?.id === v.id
                                        ? "text-white bg-white/10"
                                        : "text-white/70 hover:text-white hover:bg-white/05"
                                }`}
                            >
                                {venue?.id === v.id ? (
                                    <Sparkles size={14} className="text-[var(--volt)] flex-shrink-0" />
                                ) : (
                                    <div className="w-3.5 flex-shrink-0" />
                                )}
                                <span className="truncate">{v.name}</span>
                                <span className="ml-auto text-white/40 text-[10px] flex-shrink-0 uppercase tracking-widest">{v.city}</span>
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
        <div className="sticky top-4 z-50 px-4 w-full max-w-[1600px] mx-auto pointer-events-none mb-8">
            <header
                className="pointer-events-auto flex items-center justify-between gap-4 px-5 py-3 glass-strong border border-white/15 rounded-3xl shadow-2xl transition-all duration-500"
                style={{
                    background: "rgba(13, 13, 18, 0.65)",
                    backdropFilter: "blur(40px) saturate(200%)",
                    WebkitBackdropFilter: "blur(40px) saturate(200%)",
                }}
                data-testid="top-nav"
            >
                {/* Brand */}
                <Link to="/" className="flex items-center gap-3 group flex-shrink-0" data-testid="brand-link">
                    <div className="relative w-10 h-10 flex items-center justify-center overflow-hidden rounded-xl border border-white/20 group-hover:border-[var(--brand)]/50 transition-all duration-300"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                        <span className="font-display text-xl font-black text-white group-hover:text-[var(--brand)] transition-colors duration-300">P</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                    </div>
                    <div className="leading-none hidden sm:block">
                        <div className="font-display text-xl tracking-tight text-white">
                            PITCH<span className="text-[var(--brand)]">.</span>OPS
                        </div>
                    </div>
                </Link>

                {/* Nav links — desktop (Centered) */}
                <nav className="hidden lg:flex items-center gap-2 px-2 py-1.5 rounded-2xl border border-white/10" style={{ background: "rgba(0,0,0,0.4)" }} aria-label="Primary">
                    {NAV_LINKS.map((link) => {
                        const active = loc.pathname === link.path;
                        return (
                            <button
                                key={link.path}
                                data-testid={`nav-${link.label.toLowerCase().replace(/\s/g, "-")}`}
                                onClick={() => nav(link.path)}
                                className={`relative px-4 py-2 text-xs font-display tracking-wide uppercase transition-colors duration-200 rounded-xl ${
                                    active ? "text-white" : "text-white/60 hover:text-white"
                                }`}
                            >
                                {active && (
                                    <motion.span
                                        layoutId="nav-pill-bg"
                                        className="absolute inset-0 rounded-xl"
                                        style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
                                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                    />
                                )}
                                <span className="relative z-10">{link.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Right side controls */}
                <div className="flex items-center gap-3">

                    {/* Venue dropdown */}
                    {venues?.length > 0 && (
                        <VenueDropdown venues={venues} venue={venue} setVenueId={setVenueId} />
                    )}

                    {/* Role switcher */}
                    <div
                        className="hidden md:flex items-center glass border border-white/15 rounded-xl overflow-hidden p-1 gap-1"
                        style={{ background: "rgba(0,0,0,0.4)" }}
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
                                className={`relative px-3 py-1.5 text-[11px] font-display tracking-wider uppercase rounded-lg transition-all duration-300 ${
                                    role === r.id
                                        ? "text-black font-bold"
                                        : "text-white/50 hover:text-white/90"
                                }`}
                                style={role === r.id ? { background: r.color, boxShadow: `0 0 15px ${r.color}66` } : {}}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    {/* Mobile menu toggle */}
                    <button
                        className="lg:hidden btn-ghost btn !px-3 !py-2.5 !rounded-xl border border-white/10 glass"
                        onClick={() => setMobileOpen((o) => !o)}
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </header>

            {/* Mobile menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.3, type: "spring", bounce: 0 }}
                        className="absolute top-20 left-4 right-4 z-40 glass-strong border border-white/15 p-5 rounded-3xl shadow-2xl pointer-events-auto"
                        style={{ background: "rgba(13, 13, 18, 0.95)" }}
                    >
                        <div className="flex flex-col gap-2">
                            {NAV_LINKS.map((link) => (
                                <button
                                    key={link.path}
                                    onClick={() => { nav(link.path); setMobileOpen(false); }}
                                    className={`text-left px-5 py-4 rounded-2xl font-display uppercase tracking-wide text-sm transition-colors ${
                                        loc.pathname === link.path ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/05"
                                    }`}
                                >
                                    {link.label}
                                </button>
                            ))}
                        </div>
                        <div className="h-px bg-white/10 my-4" />
                        <div className="text-xs font-mono text-white/40 tracking-widest px-2 mb-3">SWITCH ROLE</div>
                        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Role">
                            {ROLES.map((r) => (
                                <button
                                    key={r.id}
                                    role="radio"
                                    aria-checked={role === r.id}
                                    data-testid={`role-switch-${r.id}`}
                                    onClick={() => { setRole(r.id); nav(r.id === "fan" || r.id === "volunteer" ? "/fan" : "/ops"); setMobileOpen(false); }}
                                    className="px-4 py-3 rounded-2xl text-xs font-display tracking-wider uppercase transition-all"
                                    style={role === r.id ? { background: `${r.color}22`, color: r.color, border: `1px solid ${r.color}55` } : { background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
