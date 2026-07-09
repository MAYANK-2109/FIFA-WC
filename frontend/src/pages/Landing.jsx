import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Trophy, Users, HardHat, Bot, Leaf, ArrowRight, Zap, Shield, Radio, Accessibility, Star } from "lucide-react";

const HERO_IMG = "https://houston.org/_next/image/?url=https%3A%2F%2Fwpb.houston.org%2Fapp%2Fuploads%2F2025%2F12%2FMM5_FIFA_World_Cup_2026_Ball_02Oct2025_ZU2160-scaled.jpg&w=3840&q=75";
const FAN_IMG = "https://images.pexels.com/photos/19875973/pexels-photo-19875973.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const STAFF_IMG = "https://images.pexels.com/photos/3582392/pexels-photo-3582392.jpeg";

const ROLES = [
    { id: "fan",       label: "Fan",       img: FAN_IMG,   go: "/fan", desc: "Concierge, transport, accessibility, live updates.", testid: "role-card-fan",       accent: "#F5B800", num: "01" },
    { id: "volunteer", label: "Volunteer", img: FAN_IMG,   go: "/fan", desc: "Assist guests, report issues, concierge support.",  testid: "role-card-volunteer", accent: "#00C48C", num: "02" },
    { id: "staff",     label: "Staff",     img: STAFF_IMG, go: "/ops", desc: "Crowd heatmap, incident triage, AI briefings.",     testid: "role-card-staff",     accent: "#38BDF8", num: "03" },
    { id: "organizer", label: "Organizer", img: STAFF_IMG, go: "/ops", desc: "Full ops, sustainability, decision intelligence.",  testid: "role-card-organizer", accent: "#FF4757", num: "04" },
];

const FEATURES = [
    { icon: Bot,           title: "Multilingual Concierge", body: "Gemini Flash across 8+ languages — real-time streaming answers.", accent: "#F5B800", size: "lg" },
    { icon: Radio,         title: "Live Crowd Ops",         body: "Zone-level heatmap refreshing every 15 seconds.",                accent: "#38BDF8", size: "sm" },
    { icon: Accessibility, title: "Accessibility Routing",  body: "Step-free paths, hearing loops, sensory-friendly zones.",       accent: "#00C48C", size: "sm" },
    { icon: Leaf,          title: "Sustainability",          body: "Waste, energy, water, carbon — with AI narrative.",             accent: "#00C48C", size: "sm" },
    { icon: Shield,        title: "Incident Triage",        body: "AI-powered severity classification and auto-routing.",          accent: "#FF4757", size: "sm" },
    { icon: Zap,           title: "Ops Intelligence",       body: "Real-time AI briefings for every stadium command centre.",      accent: "#F5B800", size: "lg" },
];

const STATS = [
    { k: 16,  suffix: "",  label: "HOST VENUES" },
    { k: 48,  suffix: "",  label: "NATIONS" },
    { k: 104, suffix: "",  label: "MATCHES" },
    { k: 8,   suffix: "+", label: "LANGUAGES" },
];

// Animated count-up hook
function useCountUp(target, duration = 1200) {
    const [val, setVal] = useState(0);
    const start = useRef(null);
    const frame = useRef(null);
    useEffect(() => {
        const animate = (ts) => {
            if (!start.current) start.current = ts;
            const progress = Math.min((ts - start.current) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setVal(Math.round(target * eased));
            if (progress < 1) frame.current = requestAnimationFrame(animate);
        };
        frame.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame.current);
    }, [target, duration]);
    return val;
}

function StatCard({ k, suffix, label, delay }) {
    const count = useCountUp(k, 1000 + delay * 100);
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 + delay * 0.1 }}
            className="flex flex-col items-center justify-center py-4 px-5"
            style={{ borderRight: delay < 3 ? "1px solid rgba(245,184,0,0.12)" : "none" }}
        >
            <div className="font-mono text-3xl md:text-4xl font-bold stat-number" style={{ color: "var(--brand)" }}>
                {count}{suffix}
            </div>
            <div className="text-[9px] font-mono tracking-widest mt-1" style={{ color: "var(--text-muted)" }}>{label}</div>
        </motion.div>
    );
}

// 3D tilt card — horizontal layout
function RoleCard({ r, idx, onClick }) {
    const cardRef = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [5, -5]), { stiffness: 300, damping: 30 });
    const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-5, 5]), { stiffness: 300, damping: 30 });

    const onMove = (e) => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (!rect) return;
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
    };
    const onLeave = () => { x.set(0); y.set(0); };

    return (
        <motion.div
            ref={cardRef}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 1000 }}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.07 }}
        >
            <button
                data-testid={r.testid}
                onClick={onClick}
                className="group relative w-full overflow-hidden text-left focus:outline-none focus-visible:outline focus-visible:outline-2 rounded-2xl"
                style={{
                    background: "var(--bg-surface)",
                    border: `1px solid ${r.accent}25`,
                    boxShadow: `0 0 0 0 ${r.accent}`,
                    transition: "box-shadow 0.3s, border-color 0.3s",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 8px 40px ${r.accent}20`;
                    e.currentTarget.style.borderColor = `${r.accent}50`;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 0 0 ${r.accent}`;
                    e.currentTarget.style.borderColor = `${r.accent}25`;
                }}
            >
                {/* Left accent strip */}
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: r.accent }} />

                {/* Background image (right portion) */}
                <div
                    className="absolute right-0 top-0 bottom-0 w-2/5 transition-transform duration-700 group-hover:scale-105"
                    style={{
                        backgroundImage: `url(${r.img})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                    aria-hidden="true"
                />
                {/* Fade from left */}
                <div
                    className="absolute right-0 top-0 bottom-0 w-3/5"
                    style={{ background: `linear-gradient(to right, var(--bg-surface) 40%, transparent 100%)` }}
                    aria-hidden="true"
                />
                {/* Accent glow on hover */}
                <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                    style={{ background: `radial-gradient(ellipse at 20% 50%, ${r.accent}10 0%, transparent 60%)` }}
                    aria-hidden="true"
                />

                {/* Content */}
                <div className="relative flex items-center gap-4 pl-6 pr-4 py-5">
                    {/* Number badge */}
                    <div
                        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xs font-mono font-bold"
                        style={{ background: `${r.accent}18`, border: `1px solid ${r.accent}35`, color: r.accent }}
                    >
                        {r.num}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-display text-[11px] tracking-widest mb-0.5" style={{ color: r.accent }}>
                            ROLE · {r.num}
                        </div>
                        <div className="font-display text-xl leading-none text-white">{r.label}</div>
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{r.desc}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1 text-[11px] font-mono tracking-widest group-hover:gap-2 transition-all duration-200" style={{ color: "var(--text-muted)" }}>
                        ENTER <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </button>
        </motion.div>
    );
}

export default function Landing({ setRole }) {
    const nav = useNavigate();
    const pick = (r) => { setRole(r.id); nav(r.go); };

    return (
        <div data-testid="landing" className="overflow-x-hidden">

            {/* ── HERO ──────────────────────────────────── */}
            <section className="relative min-h-screen flex items-center overflow-hidden">
                {/* Stadium background */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `url(${HERO_IMG})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center 35%",
                    }}
                    aria-hidden="true"
                />
                {/* Deep navy overlay */}
                <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(135deg, rgba(5,10,30,0.96) 0%, rgba(5,10,30,0.78) 55%, rgba(5,10,30,0.92) 100%)" }}
                    aria-hidden="true"
                />
                {/* Gold dot-mesh */}
                <div className="absolute inset-0 bg-mesh opacity-40" aria-hidden="true" />

                {/* Gold bloom — top-left */}
                <div
                    className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full blur-[140px] opacity-18 pointer-events-none"
                    style={{ background: "var(--brand)" }}
                    aria-hidden="true"
                />
                {/* Sky bloom — bottom-right */}
                <div
                    className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-12 pointer-events-none"
                    style={{ background: "var(--sky)" }}
                    aria-hidden="true"
                />

                <div className="relative max-w-[1400px] mx-auto px-6 md:px-12 pt-28 pb-20 w-full">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono tracking-widest mb-8 glow-anim"
                        style={{ background: "rgba(245,184,0,0.10)", border: "1px solid rgba(245,184,0,0.30)", color: "var(--brand)" }}
                        data-testid="challenge-badge"
                    >
                        <Trophy size={11} />
                        WC26 COMMAND · FIFA WORLD CUP 2026
                    </motion.div>

                    {/* H1 */}
                    <motion.h1
                        initial={{ opacity: 0, y: 32 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.75, delay: 0.08 }}
                        className="font-display font-black uppercase leading-[0.88] text-[min(13vw,6.5rem)] text-white"
                        data-testid="hero-title"
                    >
                        World Cup 2026
                        <br />
                        <span
                            style={{
                                background: "linear-gradient(90deg, #F5B800 0%, #FFD54F 50%, #F5B800 100%)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                                textShadow: "none",
                                filter: "drop-shadow(0 0 32px rgba(245,184,0,0.45))",
                            }}
                        >
                            Command Centre.
                        </span>
                        <br />
                        <span className="text-white/40" style={{ fontSize: "0.55em", letterSpacing: "0.12em" }}>
                            Powered by AI Intelligence.
                        </span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="mt-7 max-w-2xl text-base md:text-lg leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        Unifying real-time stadium intelligence, multilingual fan services, and proactive operations
                        management across all 16 host venues of the greatest football tournament on earth.
                    </motion.p>

                    {/* CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.45 }}
                        className="mt-10 flex flex-wrap gap-4"
                    >
                        <button
                            className="btn btn-primary !px-8 !py-4 !text-sm !rounded-xl"
                            onClick={() => pick(ROLES[0])}
                            data-testid="cta-fan"
                        >
                            <Users size={16} /> Enter Fan Hub
                        </button>
                        <button
                            className="btn btn-emerald !px-8 !py-4 !text-sm !rounded-xl"
                            onClick={() => pick(ROLES[2])}
                            data-testid="cta-staff"
                        >
                            <HardHat size={16} /> Ops Centre
                        </button>
                    </motion.div>

                    {/* Stats strip */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.65 }}
                        className="mt-16 inline-flex rounded-2xl overflow-hidden"
                        style={{ background: "rgba(245,184,0,0.05)", border: "1px solid rgba(245,184,0,0.15)" }}
                    >
                        {STATS.map((s, i) => (
                            <StatCard key={s.label} k={s.k} suffix={s.suffix} label={s.label} delay={i} />
                        ))}
                    </motion.div>
                </div>

                {/* Scroll hint */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.4 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 float"
                    style={{ color: "rgba(245,184,0,0.35)" }}
                >
                    <div className="text-[9px] font-mono tracking-widest">SCROLL</div>
                    <div className="w-px h-10" style={{ background: "linear-gradient(to bottom, rgba(245,184,0,0.4), transparent)" }} />
                </motion.div>
            </section>

            {/* Gold separator */}
            <div className="gold-line" />

            {/* ── ROLE PICKER ─────────────────────────── */}
            <section className="max-w-[1400px] mx-auto px-6 md:px-12 py-20" data-testid="role-picker">
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <div className="text-[10px] font-mono tracking-widest mb-2" style={{ color: "var(--brand)" }}>01 / CHOOSE ROLE</div>
                        <h2 className="font-display text-4xl md:text-5xl tracking-tight">Select your position</h2>
                    </div>
                    <div className="hidden md:block h-px w-24" style={{ background: "linear-gradient(to right, var(--brand), transparent)" }} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ROLES.map((r, idx) => (
                        <RoleCard key={r.id} r={r} idx={idx} onClick={() => pick(r)} />
                    ))}
                </div>
            </section>

            {/* ── FEATURES BENTO GRID ──────────────────── */}
            <section className="max-w-[1400px] mx-auto px-6 md:px-12 pb-24">
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <div className="text-[10px] font-mono tracking-widest mb-2" style={{ color: "var(--emerald)" }}>02 / CAPABILITIES</div>
                        <h2 className="font-display text-4xl md:text-5xl tracking-tight">Platform intelligence</h2>
                    </div>
                    <div className="hidden md:block h-px w-24" style={{ background: "linear-gradient(to right, var(--emerald), transparent)" }} />
                </div>

                {/* Bento grid — 2 large + 4 small */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {FEATURES.map(({ icon: I, title, body, accent, size }, idx) => (
                        <motion.div
                            key={title}
                            data-testid={`feature-${idx}`}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: idx * 0.07 }}
                            className={`group relative rounded-2xl p-6 overflow-hidden cursor-default transition-all duration-300 hover:scale-[1.02] ${
                                size === "lg" ? "md:col-span-2 md:row-span-1" : "md:col-span-1"
                            }`}
                            style={{
                                background: "var(--bg-surface)",
                                border: `1px solid ${accent}20`,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${accent}45`; e.currentTarget.style.boxShadow = `0 8px 32px ${accent}12`; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${accent}20`; e.currentTarget.style.boxShadow = "none"; }}
                        >
                            {/* Background glow blob */}
                            <div
                                className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity duration-500"
                                style={{ background: accent }}
                                aria-hidden="true"
                            />
                            {/* Left accent bar */}
                            <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full" style={{ background: accent }} />

                            <div className="relative">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                                    style={{ background: `${accent}18`, border: `1px solid ${accent}33` }}
                                >
                                    <I size={22} style={{ color: accent }} />
                                </div>
                                <div className="font-display text-xl leading-tight text-white mb-2">{title}</div>
                                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{body}</p>

                                {/* Bottom accent line on hover */}
                                <div
                                    className="mt-6 h-px w-0 group-hover:w-full transition-all duration-600"
                                    style={{ background: `linear-gradient(to right, ${accent}, transparent)` }}
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── FOOTER ──────────────────────────────── */}
            <footer style={{ borderTop: "1px solid rgba(245,184,0,0.12)" }} className="py-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <Trophy size={14} style={{ color: "var(--brand)", opacity: 0.6 }} />
                    <div className="text-[10px] font-mono tracking-widest" style={{ color: "var(--text-muted)" }}>
                        WC26 COMMAND · ALL 16 HOST VENUES · POWERED BY GOOGLE GEMINI
                    </div>
                    <Star size={12} style={{ color: "var(--brand)", opacity: 0.4 }} />
                </div>
                <div className="text-[9px] font-mono tracking-widest" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
                    FIFA WORLD CUP 2026 · INTELLIGENCE PLATFORM
                </div>
            </footer>
        </div>
    );
}
