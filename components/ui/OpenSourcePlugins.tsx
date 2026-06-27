"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FiCode, FiPackage, FiSend, FiArrowUpRight, FiGithub, FiCopy, FiCheck } from "react-icons/fi";

/* ── Types ─────────────────────────────────────────────────────── */

interface PluginStep {
  icon: "code" | "package" | "send";
  title: string;
  description: string;
}

/* ── Constants ──────────────────────────────────────────────────── */

const STEP_ICONS: Record<PluginStep["icon"], React.ComponentType<{ size?: number; className?: string }>> = {
  code: FiCode,
  package: FiPackage,
  send: FiSend,
};

/* ── Framer Motion variants ─────────────────────────────────────── */

const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
  },
});

const slideRight = {
  hidden: { opacity: 0, x: 36 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

/* ── Token types & colours ──────────────────────────────────────── */

type TokenKind =
  | "comment"   // // …
  | "keyword"   // export, const, import
  | "type"      // InstraPlugin, PluginContext
  | "string"    // "…" '…'
  | "punctuation" // { } ( ) [ ] , ; :
  | "fn"        // function / method name
  | "param"     // parameter names
  | "prop-key"  // JSON key or object key
  | "plain";    // fallback

interface Token {
  kind: TokenKind;
  text: string;
}

/** VS Code Dark+ colour palette */
const TOKEN_COLOUR: Record<TokenKind, string> = {
  comment:     "#6A9955",
  keyword:     "#569CD6",
  type:        "#4EC9B0",
  string:      "#CE9178",
  punctuation: "#808080",
  fn:          "#DCDCAA",
  param:       "#9CDCFE",
  "prop-key":  "#9CDCFE",
  plain:       "#D4D4D4",
};

/* ── Raw snippet (plain text used for copy) ─────────────────────── */

const SNIPPET_TEXT = `// manifest.json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "permissions": ["read:posts"],
  "author": "you@example.com"
}

// index.ts
export const plugin: InstraPlugin = {
  name: 'my-plugin',
  init(ctx: PluginContext) {
    ctx.registerWidget({
      slot: 'dashboard:top',
      component: MyWidget,
    });
  },
};`;

/* ── Minimal token parser ───────────────────────────────────────── */

/**
 * Splits one line of code into styled Token segments.
 * Covers the subset of JS/TS/JSON tokens present in the snippet.
 */
function tokenise(line: string): Token[] {
  if (line.startsWith("//")) return [{ kind: "comment", text: line }];

  const tokens: Token[] = [];
  let rest = line;

  const push = (kind: TokenKind, text: string) => { tokens.push({ kind, text }); rest = rest.slice(text.length); };

  const KEYWORDS = /^(export|const|import|from|return)\b/;
  const TYPES     = /^(InstraPlugin|PluginContext|MyWidget)\b/;
  const STRING_DQ = /^"(?:[^"\\]|\\.)*"/;
  const STRING_SQ = /^'(?:[^'\\]|\\.)*'/;
  const PUNCT     = /^[{}()[\],;:.]/;
  const FN_NAME   = /^([a-z_][a-zA-Z0-9_]*)(?=\s*[\({])/;
  const WORD      = /^[a-zA-Z_$][a-zA-Z0-9_$]*/;
  const SPACE     = /^[ \t]+/;

  while (rest.length > 0) {
    let m: RegExpMatchArray | null;

    if ((m = rest.match(SPACE)))            { push("plain", m[0]); continue; }
    if ((m = rest.match(KEYWORDS)))         { push("keyword", m[0]); continue; }
    if ((m = rest.match(TYPES)))            { push("type", m[0]); continue; }
    if ((m = rest.match(STRING_DQ))) {
      // JSON: "key": → prop-key; other strings → string
      const afterQuote = rest.slice(m[0].length).trimStart();
      push(afterQuote.startsWith(":") ? "prop-key" : "string", m[0]); continue;
    }
    if ((m = rest.match(STRING_SQ)))        { push("string", m[0]); continue; }
    if ((m = rest.match(PUNCT)))            { push("punctuation", m[0]); continue; }
    if ((m = rest.match(FN_NAME)))          { push("fn", m[0]); continue; }
    if ((m = rest.match(WORD)))             { push("param", m[0]); continue; }

    push("plain", rest[0]);
  }

  return tokens;
}

/* ── Decorative code block ──────────────────────────────────────── */

/**
 * Syntax-highlighted code snippet with a copy-to-clipboard button.
 * Highlights comments, keywords, types, strings, punctuation, and function names
 * using the Executive Precision colour palette.
 */
function CodeBlock() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(SNIPPET_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const lines = SNIPPET_TEXT.split("\n");

  return (
    <div className="relative w-full h-full bg-surface-container-lowest border border-white/[0.08] overflow-hidden flex flex-col">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-white/10" aria-hidden="true" />
        <div className="w-2.5 h-2.5 rounded-full bg-white/10" aria-hidden="true" />
        <div className="w-2.5 h-2.5 rounded-full bg-white/10" aria-hidden="true" />
        <span className="ml-3 font-['JetBrains_Mono'] text-[10px] text-on-surface-variant/40 tracking-widest uppercase flex-1">
          my-plugin / index.ts
        </span>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          aria-label={copied ? "Copied!" : "Copy snippet"}
          className="flex items-center gap-1.5 px-2.5 py-1 border border-white/[0.10] hover:border-white/[0.22] transition-colors duration-200 cursor-pointer group"
        >
          {copied ? (
            <FiCheck size={11} style={{ color: "#00FF41" }} />
          ) : (
            <FiCopy size={11} className="text-on-surface-variant/50 group-hover:text-on-surface-variant transition-colors duration-200" />
          )}
          <span
            className="font-['JetBrains_Mono'] text-[10px] tracking-[0.08em] transition-colors duration-200"
            style={{ color: copied ? "#00FF41" : undefined }}
          >
            {copied ? "copied" : "copy"}
          </span>
        </button>
      </div>

      {/* Code lines */}
      <div className="flex-1 p-5 overflow-hidden">
        {lines.map((line, idx) => {
          const tokens = tokenise(line);
          return (
            <div key={idx} className="flex gap-4 leading-[1.75]">
              {/* Line number */}
              <span
                className="w-5 shrink-0 font-['JetBrains_Mono'] text-[11px] select-none text-right"
                style={{ color: "rgba(196,199,200,0.18)" }}
                aria-hidden="true"
              >
                {idx + 1}
              </span>

              {/* Tokenised line */}
              <span className="font-['JetBrains_Mono'] text-[12px] whitespace-pre">
                {tokens.map((tok, ti) => (
                  <span key={ti} style={{ color: TOKEN_COLOUR[tok.kind] }}>
                    {tok.text}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, #0d0f0b)" }}
        aria-hidden="true"
      />

      {/* Blinking cursor */}
      <div
        className="absolute bottom-7 left-[4.5rem] w-[7px] h-[13px] bg-white/35 animate-pulse"
        aria-hidden="true"
      />
    </div>
  );
}

/* ── Single step row ────────────────────────────────────────────── */

/**
 * Numbered step row with icon, title, and description.
 * @param step   - Step data object
 * @param index  - Zero-based index used for the step number label
 */
function StepRow({ step, index }: { readonly step: PluginStep; readonly index: number }) {
  const Icon = STEP_ICONS[step.icon];
  return (
    <motion.div variants={fadeUp()} className="flex gap-5">
      {/* Number + connector line */}
      <div className="flex flex-col items-center shrink-0">
        <div className="flex items-center justify-center w-9 h-9 border border-white/[0.12] bg-surface-container text-on-surface-variant">
          <Icon size={15} />
        </div>
        {index < 2 && <div className="flex-1 w-px bg-white/[0.07] my-2" />}
      </div>

      {/* Copy */}
      <div className="pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-['JetBrains_Mono'] text-[10px] tracking-[0.12em] uppercase text-on-surface-variant/50">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3
            className="font-['Hanken_Grotesk'] text-sm font-semibold text-white"
            style={{ letterSpacing: "-0.01em" }}
          >
            {step.title}
          </h3>
        </div>
        <p className="font-['Hanken_Grotesk'] text-sm text-on-surface-variant leading-relaxed max-w-[38ch]">
          {step.description}
        </p>
      </div>
    </motion.div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */

/**
 * OpenSourcePlugins  explains Instra's open plugin system and how to contribute.
 * Left: mono label + heading + 3-step guide.
 * Right: decorative code block.
 * Bottom: full-width CTA bar with "Go to Docs" and "GitHub" buttons.
 *
 * @example
 * <OpenSourcePlugins />
 */
export default function OpenSourcePlugins() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  const rawSteps = t("openSourcePlugins.steps", { returnObjects: true });
  const steps: PluginStep[] = Array.isArray(rawSteps) ? (rawSteps as PluginStep[]) : [];

  return (
    <section
      className="relative w-full bg-background overflow-hidden border-t border-white/[0.07]"
      aria-labelledby="open-source-plugins-heading"
    >
      {/* Noise */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden="true"
      />

      {/* ── Body ────────────────────────────────────────────────── */}
      <div ref={sectionRef} className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-16 py-24 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">

          {/* Left: copy */}
          <div className="flex flex-col gap-10">
            {/* Header */}
            <motion.div
              className="flex flex-col gap-4"
              variants={staggerContainer}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
            >
              <motion.p
                variants={fadeUp(0)}
                className="font-['JetBrains_Mono'] text-sm font-medium tracking-[0.08em] uppercase text-on-surface-variant"
              >
                {t("openSourcePlugins.label")}
              </motion.p>

              <motion.h2
                id="open-source-plugins-heading"
                variants={fadeUp(0.07)}
                className="font-['Hanken_Grotesk'] text-4xl md:text-[48px] font-semibold text-white leading-tight"
                style={{ letterSpacing: "-0.03em" }}
              >
                {t("openSourcePlugins.heading")}
              </motion.h2>

              <motion.div
                variants={fadeUp(0.18)}
                className="h-px w-16 bg-white/20"
              />

              <motion.p
                variants={fadeUp(0.22)}
                className="font-['Hanken_Grotesk'] text-base leading-[1.8] text-on-surface-variant max-w-[46ch]"
              >
                {t("openSourcePlugins.body")}
              </motion.p>
            </motion.div>

            {/* Steps */}
            <motion.div
              className="flex flex-col"
              variants={staggerContainer}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
            >
              {steps.map((step, i) => (
                <StepRow key={i} step={step} index={i} />
              ))}
            </motion.div>
          </div>

          {/* Right: code block */}
          <motion.div
            className="hidden lg:flex flex-col min-h-[420px]"
            variants={slideRight}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
          >
            <CodeBlock />
          </motion.div>
        </div>
      </div>

      {/* ── CTA bar ─────────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 border-t border-white/[0.07]"
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-[1280px] mx-auto px-5 md:px-16 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Tag line */}
          <p className="font-['Hanken_Grotesk'] text-sm text-on-surface-variant max-w-[42ch] leading-relaxed">
            {t("openSourcePlugins.ctaTagline")}
          </p>

          {/* Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Secondary: GitHub */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-11 px-5 border border-white/[0.15] text-accent-bone hover:border-white/30 hover:text-white transition-colors duration-200 font-['Hanken_Grotesk'] text-sm font-medium cursor-pointer"
              aria-label={t("openSourcePlugins.githubAriaLabel")}
            >
              <FiGithub size={15} />
              {t("openSourcePlugins.githubButton")}
            </a>

            {/* Primary: Docs */}
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 h-11 px-5 bg-white text-on-primary hover:bg-accent-bone transition-colors duration-200 font-['Hanken_Grotesk'] text-sm font-semibold cursor-pointer"
            >
              {t("openSourcePlugins.docsButton")}
              <FiArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
