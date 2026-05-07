import { useState, useRef } from "react";
import Anthropic from "@anthropic-ai/sdk";

const BASE_SYSTEM_PROMPT = `You are a LinkedIn content writer for HiCenter Ventures.

ABOUT HICENTER VENTURES:
HiCenter Ventures was founded in 2021 and is based in Haifa, Israel. It is a unique venture capital fund whose LP is Haifa Municipality's economic company. The mission is to develop Haifa's tech ecosystem and keep entrepreneurs building in the city.
CEO: Lior Hanuka.
To date: 100+ startups invested in, $300M+ raised in follow-on funding by portfolio companies, 24 investments in 2025, ~20 planned for 2026.
Investment focus: AI, Energy, Digital Health, Foodtech, Blue Economy (ocean tech), and DefenseTech.
Beyond capital, HiCenter works hands-on with founders on business development, strategic thinking, key connections, and refining product-market fit.
Investment arm: HiFund (runs an Angel Investment course and connects to global VC networks).
DefenseTech Fund: HiCenter Defense Tech Fund — 400,000 NIS investment including a 100,000 NIS non-dilutive grant, 4-pillar strategic support, 9-18 month acceleration framework.
Notable portfolio: Octopus AI (AI-based digital workers for finance), AKA Foods ($17M raised), CarbonBlue ($12M raised), ClaroAI, HPC Labs, and others.

LANGUAGE RULE — strict, no exceptions:
If the input is in Hebrew, or the topic is about Israeli entrepreneurs, community events, local ecosystem, education, people, or Hebrew-language news — write the ENTIRE post in Hebrew.
If the input is in English, or the topic is investments, DefenseTech, BlueTech, international events, or global outreach — write the ENTIRE post in English.
Never mix languages in a single post. Company names (Octopus AI, ClaroAI, etc.) stay in English even inside Hebrew posts.

VOICE AND TONE:
Write the way a smart, warm person at a VC firm would write — not a PR agency, not a marketing bot.
Use "we" naturally throughout. Sound like a real person sharing something they genuinely care about.
Be direct and confident without being corporate or stiff.
In Hebrew: warm, storytelling, community-oriented. Express pride and gratitude naturally. Feel free to open with a genuine personal reaction or observation.
In English: clear, human, and energetic. Confident without sounding like a press release. Use semicolons when connecting two related ideas instead of dashes.

STRUCTURE:
1. Hook (first line): A genuine observation, bold announcement, or honest reaction that earns the read. End this line with one relevant emoji (🚀 momentum, 🔝 excellence, 💡 insight, 🛡️ defense, 💰 investment, or contextually appropriate).
2. Body: 2-4 short paragraphs, each separated by a blank line. One clear thought per paragraph. Tell the story naturally: what happened, who was involved, why it matters.
3. Closing: A warm CTA, a question to the reader, a link reference, or gratitude. Flow naturally from the body — no section header. Use ❓ for questions, 👉 before a link, 👇 when pointing to a link below, 👏 at the end of a gratitude line.
4. Hashtags: 4-7 relevant tags on the final line with no blank line before them.

HEBREW CLOSING PATTERNS (use naturally when appropriate):
- Pride in portfolio: "אנחנו ב-HiCenter Ventures גאים להשקיע ב-[Company] ולתמוך ביזמים שבונים את הדבר הגדול הבא."
- General pride: "אנחנו ב-HiCenter Ventures גאים להעניק [experience/support]..."
- Gratitude: "תודה ל-[Name/org] על [reason]. 👏"
- Quote attribution: "לדברי [Name], [title]..."
- CTA with question: End with a question using ❓ followed by a short invitation on the next line.

STRUCTURED ENGLISH ANNOUNCEMENTS (for fund launches, calls for applications, etc.):
Use emoji as section headers when the post has distinct components:
💰 for investment/funding details, 🎯 for mission or focus, 🔹 or ▫️ for bullet list items under each section.

LISTS:
Use ▫️, ✅, or 🔹 as bullet markers only for genuine lists of items (requirements, focus areas, investment components). Never use them as sentence transitions.

STRICT PROHIBITIONS — NEVER do any of the following:
Never use → anywhere.
Never use — (em dash) or – (en dash) anywhere.
Never use - to transition between ideas (hyphens in compound words like "pre-seed" or "dual-use" are fine).
Never start a line with a dash or hyphen.
Never pad. Write as much as the content needs, nothing more.
Never sound like a press release or a generic startup post.

LENGTH: Whatever the story needs. Typically 6-14 lines including blank lines. A simple update can be 5 lines; a real story with people, context, and meaning can run longer.

Output ONLY the post text — no explanation, no preamble, no metadata.`;

const FEEDBACK_STORAGE_KEY = "linkedin-generator-feedback";

function loadFeedback(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveFeedback(items: string[]) {
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(items));
}

function buildSystemPrompt(feedbackItems: string[]): string {
  if (feedbackItems.length === 0) return BASE_SYSTEM_PROMPT;
  const lines = feedbackItems.map((f, i) => `${i + 1}. ${f}`).join("\n");
  return `${BASE_SYSTEM_PROMPT}

USER PREFERENCES (learned from past feedback — apply strictly to every post):
${lines}`;
}

// Color tokens
const C = {
  pageBg: "#edf2fb",
  cardBg: "#e2eafc",
  inputBg: "#f5f8ff",
  border: "#c1d3fe",
  borderFocus: "#93aff7",
  navy: "#1e3a8a",
  navyHover: "#1e40af",
  teal: "#0ea5e9",
  textPrimary: "#1e2d5a",
  textSecondary: "#4a5f9a",
  textMuted: "#8fa3c8",
  errorBg: "#fef2f2",
  errorBorder: "#fca5a5",
  errorText: "#b91c1c",
  successBg: "#eff6ff",
  successBorder: "#93c5fd",
  successText: "#1d4ed8",
  skeletonBg: "#d1ddfb",
};

export default function App() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [feedbackItems, setFeedbackItems] = useState<string[]>(loadFeedback);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  async function handleGenerate() {
    if (!input.trim()) return;
    setIsLoading(true);
    setError("");
    setOutput("");

    try {
      const client = new Anthropic({
        apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
        dangerouslyAllowBrowser: true,
      });

      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: buildSystemPrompt(feedbackItems),
        messages: [{ role: "user", content: input.trim() }],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "";
      setOutput(text);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmitFeedback() {
    const trimmed = feedbackInput.trim();
    if (!trimmed) return;
    const updated = [...feedbackItems, trimmed];
    setFeedbackItems(updated);
    saveFeedback(updated);
    setFeedbackInput("");
    setFeedbackSaved(true);
    setTimeout(() => setFeedbackSaved(false), 2500);
  }

  async function handleCopy() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      outputRef.current?.select();
      document.execCommand("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: C.pageBg }}
    >
      {/* Top navbar */}
      <div className="px-6 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
        <img
          src="/hicenter-logo.png"
          alt="HiCenter"
          className="h-20 w-auto object-contain"
        />
      </div>

      <div className="flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: C.navy }}
          >
            LinkedIn Post Generator
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: C.textSecondary }}>
            Turn rough notes into polished posts — powered by Claude
          </p>
        </div>

        {/* Input card */}
        <div
          className="rounded-2xl p-5 mb-3 shadow-sm"
          style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}
        >
          <label
            htmlFor="input"
            className="block text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: C.textSecondary }}
          >
            Your Raw Idea
          </label>
          <textarea
            id="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
            }}
            placeholder="What do you want to post about?"
            rows={5}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition"
            style={{
              backgroundColor: C.inputBg,
              border: `1px solid ${C.border}`,
              color: C.textPrimary,
            }}
          />
          <button
            onClick={handleGenerate}
            disabled={isLoading || !input.trim()}
            className="mt-3 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: C.navy }}
          >
            {isLoading ? "Generating…" : "Generate Post"}
          </button>
          <p className="mt-2 text-center text-xs" style={{ color: C.textMuted }}>
            Tip: ⌘↵ to generate
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-2xl px-4 py-3 mb-3 text-sm"
            style={{
              backgroundColor: C.errorBg,
              border: `1px solid ${C.errorBorder}`,
              color: C.errorText,
            }}
          >
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div
            className="rounded-2xl p-5 animate-pulse shadow-sm"
            style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}
          >
            {[1, 0.9, 0.75, 1, 0.6].map((w, i) => (
              <div
                key={i}
                className="h-3 rounded-full mb-2.5 last:mb-0"
                style={{ backgroundColor: C.skeletonBg, width: `${w * 100}%` }}
              />
            ))}
          </div>
        )}

        {/* Output card */}
        {output && !isLoading && (
          <div
            className="rounded-2xl p-5 shadow-sm"
            style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: C.textSecondary }}
              >
                Generated Post
              </span>
              <button
                onClick={handleCopy}
                className="text-xs font-semibold px-3 py-1 rounded-lg transition-colors"
                style={{
                  backgroundColor: copied ? C.successBg : C.inputBg,
                  color: copied ? C.successText : C.textSecondary,
                  border: `1px solid ${copied ? C.successBorder : C.border}`,
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <textarea
              ref={outputRef}
              value={output}
              readOnly
              rows={14}
              className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none leading-relaxed"
              style={{
                backgroundColor: C.inputBg,
                border: `1px solid ${C.border}`,
                color: C.textPrimary,
              }}
            />
          </div>
        )}

        {/* Feedback card */}
        {output && !isLoading && (
          <div
            className="rounded-2xl p-5 mt-3 shadow-sm"
            style={{ backgroundColor: C.cardBg, border: `1px solid ${C.border}` }}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: C.textSecondary }}
              >
                Refine Future Posts
              </span>
              {feedbackItems.length > 0 && (
                <span
                  className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: C.successBg,
                    color: C.successText,
                    border: `1px solid ${C.successBorder}`,
                  }}
                >
                  {feedbackItems.length} preference{feedbackItems.length !== 1 ? "s" : ""} saved
                </span>
              )}
            </div>
            <p className="text-xs mb-3" style={{ color: C.textMuted }}>
              Tell the generator what to do differently — it will apply your feedback to every post from now on.
            </p>
            <textarea
              value={feedbackInput}
              onChange={(e) => setFeedbackInput(e.target.value)}
              placeholder="e.g. Use shorter sentences. Avoid buzzwords. Always end with a question."
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none"
              style={{
                backgroundColor: C.inputBg,
                border: `1px solid ${C.border}`,
                color: C.textPrimary,
              }}
            />
            <button
              onClick={handleSubmitFeedback}
              disabled={!feedbackInput.trim()}
              className="mt-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: feedbackSaved ? C.successBg : C.inputBg,
                color: feedbackSaved ? C.successText : C.textSecondary,
                border: `1px solid ${feedbackSaved ? C.successBorder : C.border}`,
              }}
            >
              {feedbackSaved ? "Preference saved — next post will reflect this" : "Submit Feedback"}
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-xs" style={{ color: C.textMuted }}>
          Powered by Claude Sonnet 4.6
        </p>
      </div>
      </div>
    </div>
  );
}
