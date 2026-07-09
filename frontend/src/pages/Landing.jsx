import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Trophy, Users, HardHat, Bot, Leaf, ArrowRight, Zap, Shield, Radio, Accessibility } from "lucide-react";

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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 + delay * 0.08 }}
            className="flex flex-col items-center justify-center py-5 px-7"
            style={{ borderRight: delay < 3 ? "1px solid rgba(255,255,255,0.08)" : "none" }}
        >
            <div className="font-mono text-3xl font-bold stat-number text-white">
                {count}{suffix}
            </div>
            <div className="text-[9px] font-mono tracking-widest mt-1.5" style={{ color: "var(--text-muted)" }}>{label}</div>
        </motion.div>
    );
}

function RoleCard({ r, idx, onClick }) {
    const cardRef = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [4, -4]), { stiffness: 300, damping: 35 });
    const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-4, 4]), { stiffness: 300, damping: 35 });

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
            style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 1200 }}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: idx * 0.06 }}
        >
            <button
                data-testid={r.testid}
                onClick={onClick}
                className="group relative w-full overflow-hidden text-left focus:outline-none focus-visible:outline-2 rounded-2xl transition-all duration-300"
                style={{
                    background: "var(--bg-surface)",
                    border: `1px solid rgba(255,255,255,0.08)`,
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `rgba(255,255,255,0.16)`;
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.5)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `rgba(255,255,255,0.08)`;
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                }}
            >
                {/* Thin left accent */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: r.accent, opacity: 0.85 }} />

                <div className="flex items-center gap-5 pl-6 pr-5 py-5">
                    {/* Number */}
                    <div
                        className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold"
                        style={{ background: `${r.accent}12`, color: r.accent }}
                    >
                        {r.num}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono tracking-widest mb-0.5" style={{ color: r.accent, opacity: 0.8 }}>
                            ROLE · {r.num}
                        </div>
                        <div className="font-display text-lg font-semibold text-white">{r.label}</div>
                        <p className="text-[13px] mt-0.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{r.desc}</p>
                    </div>
                    <ArrowRight
                        size={16}
                        className="flex-shrink-0 group-hover:translate-x-1 transition-transform duration-200"
                        style={{ color: "var(--text-muted)" }}
                    />
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
            <section className="relative min-h-screen flex items-end overflow-hidden">
                {/* Stadium image */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `url(${HERO_IMG})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center 40%",
                    }}
                    aria-hidden="true"
                />
                {/* Single clean dark overlay — no colored blobs */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: "linear-gradient(to bottom, rgba(5,10,30,0.72) 0%, rgba(5,10,30,0.60) 40%, rgba(5,10,30,0.96) 85%, #050A1E 100%)"
                    }}
                    aria-hidden="true"
                />

                {/* Content sits at the bottom */}
                <div className="relative w-full max-w-[1400px] mx-auto px-6 md:px-12 pb-20 pt-32">

                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono tracking-widest mb-6"
                        style={{
                            background: "rgba(245,184,0,0.10)",
                            border: "1px solid rgba(245,184,0,0.25)",
                            color: "#F5B800",
                        }}
                        data-testid="challenge-badge"
                    >
                        <Trophy size={10} />
                        WC26 COMMAND · FIFA WORLD CUP 2026
                    </motion.div>

                    {/* H1 */}
                    <motion.h1
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.65, delay: 0.08 }}
                        className="font-display font-black uppercase leading-[0.9] text-white"
                        style={{ fontSize: "clamp(3rem, 9vw, 7rem)" }}
                        data-testid="hero-title"
                    >
                        World Cup 2026
                        <br />
                        <span style={{ color: "#F5B800" }}>Command Centre.</span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.28 }}
                        className="mt-5 max-w-xl text-base md:text-lg leading-relaxed"
                        style={{ color: "rgba(255,255,255,0.55)" }}
                    >
                        Real-time stadium intelligence, multilingual fan services, and proactive operations
                        across all 16 host venues.
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.4 }}
                        className="mt-8 flex flex-wrap gap-3"
                    >
                        <button
                            className="btn btn-primary !px-7 !py-3.5 !text-[13px] !rounded-xl"
                            onClick={() => pick(ROLES[0])}
                            data-testid="cta-fan"
                        >
                            <Users size={15} /> Fan Hub
                        </button>
                        <button
                            className="btn !px-7 !py-3.5 !text-[13px] !rounded-xl"
                            style={{ background: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.15)", color: "#fff" }}
                            onClick={() => pick(ROLES[2])}
                            data-testid="cta-staff"
                        >
                            <HardHat size={15} /> Ops Centre
                        </button>
                    </motion.div>

                    {/* Stats strip */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.58 }}
                        className="mt-12 inline-flex rounded-xl overflow-hidden"
                        style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                        }}
                    >
                        {STATS.map((s, i) => (
                            <StatCard key={s.label} k={s.k} suffix={s.suffix} label={s.label} delay={i} />
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── ROLE PICKER ─────────────────────────── */}
            <section className="max-w-[1400px] mx-auto px-6 md:px-12 py-20" data-testid="role-picker">
                <div className="mb-10">
                    <div className="text-[10px] font-mono tracking-widest mb-2" style={{ color: "var(--brand)" }}>01 / CHOOSE ROLE</div>
                    <h2 className="font-display text-3xl md:text-4xl tracking-tight text-white">Select your position</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ROLES.map((r, idx) => (
                        <RoleCard key={r.id} r={r} idx={idx} onClick={() => pick(r)} />
                    ))}
                </div>
            </section>

            {/* Divider */}
            <div className="max-w-[1400px] mx-auto px-6 md:px-12">
                <div style={{ height: "1px", background: "rgba(255,255,255,0.07)" }} />
            </div>

            {/* ── FEATURES ─────────────────────────────── */}
            <section className="max-w-[1400px] mx-auto px-6 md:px-12 py-20">
                <div className="mb-10">
                    <div className="text-[10px] font-mono tracking-widest mb-2" style={{ color: "var(--emerald)" }}>02 / CAPABILITIES</div>
                    <h2 className="font-display text-3xl md:text-4xl tracking-tight text-white">Platform intelligence</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {FEATURES.map(({ icon: I, title, body, accent }, idx) => (
                        <motion.div
                            key={title}
                            data-testid={`feature-${idx}`}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.38, delay: idx * 0.06 }}
                            className="group rounded-2xl p-6 transition-all duration-300"
                            style={{
                                background: "var(--bg-surface)",
                                border: "1px solid rgba(255,255,255,0.07)",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.4)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                            }}
                        >
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                                style={{ background: `${accent}14`, border: `1px solid ${accent}28` }}
                            >
                                <I size={18} style={{ color: accent }} />
                            </div>
                            <div className="font-display text-[17px] font-semibold text-white mb-2">{title}</div>
                            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{body}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── FOOTER ──────────────────────────────── */}
            <footer
                className="py-8 text-center"
                style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
            >
                <div className="text-[10px] font-mono tracking-widest" style={{ color: "var(--text-muted)" }}>
                    WC26 COMMAND · ALL 16 HOST VENUES · POWERED BY GOOGLE GEMINI
                </div>
            </footer>
        </div>
    );
}
