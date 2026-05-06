import { useState, useRef } from "react";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a LinkedIn content writer for HiCenter Ventures, a VC and ecosystem builder based in Haifa, Israel.

LANGUAGE RULE — strict, no exceptions:
- If the user's input is in Hebrew OR the post is about Israeli entrepreneurs, local ecosystem, jobs, or community → write the ENTIRE post in Hebrew.
- If the input is in English OR the topic is investments, DefenseTech, BlueTech, international events, or global outreach → write the ENTIRE post in English.
- Never mix languages within a single post.

STRUCTURE — every post must follow this exactly:
1. Hook (line 1): A bold fact, announcement, or statement. One sentence, one emoji (🚀 for momentum / 🔝 for excellence / 💡 for insight).
2. Body (2–4 short lines): The key message — what happened, what it means, why it matters. Use → for transitions. Use ▫️ or ✅ for bullet lists when listing items.
3. CTA (last 1–2 lines): A single, sharp call to action or a strong closing statement. Keep the same tone — don't switch messages.
4. Hashtags: 3–5 relevant tags on the final line.

TONE: Energetic and ambitious, not boastful. "We're building something real" — local pride, global ambition. Use 🔝 to signal excellence, 🚀 to signal forward movement. Confident, direct, no filler words.

LENGTH: 5–10 lines total. No more. If the content is thin, write less — don't pad.

Output ONLY the post text — no explanation, no preamble, no metadata.`;

export default function App() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
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
        system: SYSTEM_PROMPT,
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
      className="min-h-screen flex flex-col items-center px-4 py-12"
      style={{ backgroundColor: "#0D1117" }}
    >
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            LinkedIn Post Generator
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: "#8B949E" }}>
            Turn rough notes into polished posts — powered by Claude
          </p>
        </div>

        {/* Input card */}
        <div
          className="rounded-xl p-5 mb-3"
          style={{ backgroundColor: "#161B22", border: "1px solid #30363D" }}
        >
          <label
            htmlFor="input"
            className="block text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: "#8B949E" }}
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
            className="w-full rounded-lg px-4 py-3 text-sm text-white resize-none outline-none transition"
            style={{
              backgroundColor: "#0D1117",
              border: "1px solid #30363D",
              color: "white",
            }}
          />
          <button
            onClick={handleGenerate}
            disabled={isLoading || !input.trim()}
            className="mt-3 w-full py-3 rounded-lg text-sm font-semibold text-black transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#00D4AA" }}
          >
            {isLoading ? "Generating…" : "Generate Post"}
          </button>
          <p className="mt-2 text-center text-xs" style={{ color: "#484F58" }}>
            Tip: ⌘↵ to generate
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 mb-3 text-sm"
            style={{
              backgroundColor: "#2D1B1B",
              border: "1px solid #6E3030",
              color: "#F87171",
            }}
          >
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div
            className="rounded-xl p-5 animate-pulse"
            style={{ backgroundColor: "#161B22", border: "1px solid #30363D" }}
          >
            {[1, 0.9, 0.75, 1, 0.6].map((w, i) => (
              <div
                key={i}
                className="h-3 rounded mb-2.5 last:mb-0"
                style={{ backgroundColor: "#21262D", width: `${w * 100}%` }}
              />
            ))}
          </div>
        )}

        {/* Output card */}
        {output && !isLoading && (
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: "#161B22", border: "1px solid #30363D" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "#8B949E" }}
              >
                Generated Post
              </span>
              <button
                onClick={handleCopy}
                className="text-xs font-medium px-3 py-1 rounded-md transition-colors"
                style={{
                  backgroundColor: copied ? "#1A3A2E" : "#21262D",
                  color: copied ? "#00D4AA" : "#8B949E",
                  border: "1px solid #30363D",
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
              className="w-full rounded-lg px-4 py-3 text-sm text-white resize-none outline-none leading-relaxed"
              style={{
                backgroundColor: "#0D1117",
                border: "1px solid #30363D",
              }}
            />
          </div>
        )}

        <p className="mt-6 text-center text-xs" style={{ color: "#484F58" }}>
          Powered by Claude Sonnet 4.6
        </p>
      </div>
    </div>
  );
}
