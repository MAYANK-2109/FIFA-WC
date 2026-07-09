import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Users, HardHat, Radio, Accessibility, Bot, Leaf, ArrowRight, Zap, Shield } from "lucide-react";

const HERO_IMG = "https://houston.org/_next/image/?url=https%3A%2F%2Fwpb.houston.org%2Fapp%2Fuploads%2F2025%2F12%2FMM5_FIFA_World_Cup_2026_Ball_02Oct2025_ZU2160-scaled.jpg&w=3840&q=75";
const FAN_IMG = "https://images.pexels.com/photos/19875973/pexels-photo-19875973.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const STAFF_IMG = "https://images.pexels.com/photos/3582392/pexels-photo-3582392.jpeg";

const ROLES = [
    { id: "fan",       label: "Fan",       img: FAN_IMG,   go: "/fan", desc: "Concierge, transport, accessibility, incidents.", testid: "role-card-fan",       accent: "#ff1e56", num: "01" },
    { id: "volunteer", label: "Volunteer", img: FAN_IMG,   go: "/fan", desc: "Ask the concierge, help lost guests, report issues.", testid: "role-card-volunteer", accent: "#ccff00", num: "02" },
    { id: "staff",     label: "Staff",     img: STAFF_IMG, go: "/ops", desc: "Crowd heatmap, incident triage, AI briefings.", testid: "role-card-staff",      accent: "#00e5ff", num: "03" },
    { id: "organizer", label: "Organizer", img: STAFF_IMG, go: "/ops", desc: "Full ops, sustainability, decision support.", testid: "role-card-organizer",   accent: "#ffd600", num: "04" },
];

const FEATURES = [
    { icon: Bot,           title: "Multilingual Concierge", body: "Gemini Flash, 8+ languages, streaming answers in real-time.", accent: "#ccff00" },
    { icon: Radio,         title: "Live Crowd Ops",         body: "Zone-level heatmap updating every 15 seconds.", accent: "#ff1e56" },
    { icon: Accessibility, title: "Accessibility Routing",  body: "Step-free paths, hearing loops, sensory-friendly zones.", accent: "#00e5ff" },
    { icon: Leaf,          title: "Sustainability",          body: "Waste, energy, water, carbon — with AI narrative.", accent: "#ccff00" },
    { icon: Shield,        title: "Incident Triage",        body: "AI-powered severity classification and auto-routing.", accent: "#ffd600" },
    { icon: Zap,           title: "Ops Intelligence",       body: "Real-time AI briefings for every stadium command centre.", accent: "#ff1e56" },
];

const STATS = [
    { k: 16,   suffix: "",  label: "HOST VENUES" },
    { k: 48,   suffix: "",  label: "NATIONS" },
    { k: 104,  suffix: "",  label: "MATCHES" },
    { k: 8,    suffix: "+", label: "LANGUAGES" },
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
            className="glass border border-white/10 p-4 rounded-lg"
        >
            <div className="font-mono text-4xl font-bold text-white stat-number">
                {count}{suffix}
            </div>
            <div className="text-[10px] font-mono tracking-widest text-white/50 mt-1">{label}</div>
        </motion.div>
    );
}

// 3D tilt card
function RoleCard({ r, idx, onClick }) {
    const cardRef = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
    const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });

    const onMove = (e) => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (!rect) return;
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top)  / rect.height - 0.5);
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
            transition={{ duration: 0.5, delay: idx * 0.08 }}
        >
            <button
                data-testid={r.testid}
                onClick={onClick}
                className="group relative w-full aspect-[4/5] overflow-hidden text-left focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ccff00] rounded-xl"
                style={{ boxShadow: `0 0 0 1px ${r.accent}22` }}
            >
                {/* Background image */}
                <div
                    className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
                    style={{
                        backgroundImage: `url(${r.img})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                    aria-hidden="true"
                />
                {/* Gradient overlay */}
                <div
                    className="absolute inset-0 transition-opacity duration-300"
                    style={{
                        background: `linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.95) 100%)`,
                    }}
                    aria-hidden="true"
                />
                {/* Accent glow on hover */}
                <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `radial-gradient(ellipse at bottom, ${r.accent}18 0%, transparent 70%)` }}
                    aria-hidden="true"
                />
                {/* Accent top border */}
                <div
                    className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: r.accent }}
                    aria-hidden="true"
                />

                {/* Content */}
                <div className="relative h-full flex flex-col justify-end p-5">
                    <div className="font-mono text-[10px] tracking-widest mb-2" style={{ color: r.accent }}>
                        ROLE · {r.num}
                    </div>
                    <div className="font-display text-4xl leading-none text-white">{r.label}</div>
                    <p className="text-xs text-white/70 mt-2 leading-relaxed">{r.desc}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-[11px] font-mono tracking-widest text-white/60 group-hover:text-white transition-colors">
                        ENTER <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </span>
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
            {/* ── HERO ─────────────────────────────── */}
            <section className="relative min-h-screen flex items-center overflow-hidden">
                {/* Stadium background */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `url(${HERO_IMG})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center 30%",
                    }}
                    aria-hidden="true"
                />
                {/* Dark gradient */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: "linear-gradient(135deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.85) 100%)",
                    }}
                    aria-hidden="true"
                />
                {/* Mesh overlay */}
                <div className="absolute inset-0 bg-mesh opacity-30" aria-hidden="true" />
                {/* Brand glow */}
                <div
                    className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 pointer-events-none"
                    style={{ background: "var(--brand)" }}
                    aria-hidden="true"
                />
                <div
                    className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-[100px] opacity-15 pointer-events-none"
                    style={{ background: "var(--stadium-blue)" }}
                    aria-hidden="true"
                />

                <div className="relative max-w-[1600px] mx-auto px-6 md:px-12 pt-24 pb-32 w-full grid md:grid-cols-12 gap-8 items-center">
                    <div className="md:col-span-7 lg:col-span-8">
                        {/* Badge */}
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center gap-2 bg-[#ccff00]/10 border border-[#ccff00]/30 px-3 py-1.5 rounded-full text-[10px] font-mono tracking-widest text-[#ccff00] mb-6 glow-anim"
                            data-testid="challenge-badge"
                        >
                            <Sparkles size={11} />
                            PITCH.OPS · FIFA WORLD CUP 2026
                        </motion.div>

                        {/* H1 */}
                        <motion.h1
                            initial={{ opacity: 0, y: 28 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.08 }}
                            className="font-display font-black uppercase leading-[0.9] text-[min(14vw,7rem)] text-white"
                            data-testid="hero-title"
                        >
                            The Future<br />
                            Of Football.<br />
                            <span className="text-[var(--brand)]" style={{ textShadow: "0 0 40px var(--brand-glow)" }}>
                                Powered by AI.
                            </span>
                        </motion.h1>

                        {/* Subtitle */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="mt-7 max-w-xl text-white/65 text-base md:text-lg leading-relaxed"
                        >
                            Elevate the FIFA World Cup 2026 experience across all 16 host cities. Seamlessly integrating real-time intelligence, multilingual concierge services, and proactive operations command for the ultimate global stage.
                        </motion.p>

                        {/* CTA buttons */}
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.45 }}
                            className="mt-10 flex flex-wrap gap-4"
                        >
                            <button
                                className="btn btn-primary !px-7 !py-4 !text-sm"
                                onClick={() => pick(ROLES[0])}
                                data-testid="cta-fan"
                            >
                                <Users size={17} /> Enter as Fan
                            </button>
                            <button
                                className="btn btn-volt !px-7 !py-4 !text-sm"
                                onClick={() => pick(ROLES[2])}
                                data-testid="cta-staff"
                            >
                                <HardHat size={17} /> Ops Command
                            </button>
                        </motion.div>
                    </div>

                    {/* Stats */}
                    <div className="md:col-span-5 lg:col-span-4 grid grid-cols-2 gap-3">
                        {STATS.map((s, i) => (
                            <StatCard key={s.label} k={s.k} suffix={s.suffix} label={s.label} delay={i} />
                        ))}
                    </div>
                </div>

                {/* Scroll hint */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 float"
                >
                    <div className="text-[9px] font-mono tracking-widest">SCROLL</div>
                    <div className="w-px h-10 bg-gradient-to-b from-white/30 to-transparent" />
                </motion.div>
            </section>

            {/* ── ROLE PICKER ──────────────────────── */}
            <section className="max-w-[1600px] mx-auto px-6 md:px-12 py-20" data-testid="role-picker">
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <div className="text-[10px] font-mono tracking-widest text-[#ff1e56] mb-2">01 / CHOOSE ROLE</div>
                        <h2 className="font-display text-4xl md:text-5xl tracking-tight">Choose your side</h2>
                    </div>
                    <div className="hidden md:block w-24 h-px bg-gradient-to-r from-[#ff1e56] to-transparent" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {ROLES.map((r, idx) => (
                        <RoleCard key={r.id} r={r} idx={idx} onClick={() => pick(r)} />
                    ))}
                </div>
            </section>

            {/* ── FEATURES ─────────────────────────── */}
            <section className="max-w-[1600px] mx-auto px-6 md:px-12 pb-24">
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <div className="text-[10px] font-mono tracking-widest text-[#ccff00] mb-2">02 / CAPABILITIES</div>
                        <h2 className="font-display text-4xl md:text-5xl tracking-tight">What the platform does</h2>
                    </div>
                    <div className="hidden md:block w-24 h-px bg-gradient-to-r from-[#ccff00] to-transparent" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {FEATURES.map(({ icon: I, title, body, accent }, idx) => (
                        <motion.div
                            key={title}
                            data-testid={`feature-${idx}`}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: idx * 0.07 }}
                            className="group glass border border-white/08 rounded-xl p-6 hover:border-white/20 transition-all duration-300 cursor-default"
                            style={{ "--accent": accent }}
                        >
                            <div
                                className="w-11 h-11 rounded-lg flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                                style={{ background: `${accent}18`, border: `1px solid ${accent}33` }}
                            >
                                <I size={20} style={{ color: accent }} />
                            </div>
                            <div className="font-display text-xl leading-tight text-white">{title}</div>
                            <p className="text-sm text-white/55 mt-2 leading-relaxed">{body}</p>
                            <div
                                className="mt-5 h-px w-0 group-hover:w-full transition-all duration-500"
                                style={{ background: `linear-gradient(to right, ${accent}, transparent)` }}
                            />
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── FOOTER ───────────────────────────── */}
            <footer className="border-t border-white/08 py-8 text-center">
                <div className="text-[10px] font-mono tracking-widest text-white/30">
                    PITCH.OPS · BUILT FOR FIFA WORLD CUP 2026 · POWERED BY GEMINI
                </div>
            </footer>
        </div>
    );
}
