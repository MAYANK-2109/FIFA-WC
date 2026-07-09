export const QUICK_PROMPTS = [
    "Where is the nearest restroom to section 118?",
    "How do I get to the stadium by metro?",
    "What food options are vegetarian & halal?",
    "Wheelchair-accessible route from Gate A?",
    "Match schedule today at this venue?",
];

export default function QuickPrompts({ onPick, disabled }) {
    return (
        <div className="flex gap-2 overflow-x-auto pb-1" data-testid="quick-prompts">
            {QUICK_PROMPTS.map((p) => (
                <button
                    key={p}
                    onClick={() => onPick(p)}
                    disabled={disabled}
                    className="whitespace-nowrap text-[11px] font-mono uppercase tracking-wider border border-white/15 px-3 py-1.5 hover:bg-white hover:text-black transition-colors disabled:opacity-40"
                    data-testid="quick-prompt-btn"
                >
                    {p}
                </button>
            ))}
        </div>
    );
}
