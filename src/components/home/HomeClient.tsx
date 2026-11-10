"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { loadPendingGame, savePendingGame } from "@/hooks/pendingGame";
import { checkPgnFile, looksBinary } from "@/lib/pgn/fileCheck";
import { parsePgn } from "@/lib/pgn/parsePgn";
import { PgnError } from "@/lib/pgn/types";
import { SAMPLE_GAMES } from "@/lib/pgn/samples";
import { ANALYSIS_PRESETS, DEFAULT_PRESET_ID, presetById } from "@/lib/review/presets";

/** Reads a user-chosen file as text in the browser (FR-PGN-2). Nothing is uploaded. */
function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("The file could not be read."));
    reader.readAsText(file);
  });
}

export function HomeClient() {
  const router = useRouter();
  const [pgn, setPgn] = useState("");
  const [presetId, setPresetId] = useState<string>(DEFAULT_PRESET_ID);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaId = useId();
  const errorId = useId();

  // Coming back from a review ("Edit the PGN") keeps the previous game in the box.
  useEffect(() => {
    const previous = loadPendingGame();
    if (previous) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPgn(previous.pgn);
      setPresetId(presetById(previous.presetId).id);
    }
  }, []);

  const submit = (text: string) => {
    setError(null);
    try {
      parsePgn(text);
    } catch (e) {
      setError(e instanceof PgnError ? e.message : "The PGN could not be read.");
      return;
    }
    setSubmitting(true);
    savePendingGame({ pgn: text, presetId });
    router.push("/review/");
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const problem = checkPgnFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    try {
      const text = await readFile(file);
      if (looksBinary(text)) {
        setError("That file does not look like a PGN. Choose a .pgn or text file.");
        return;
      }
      setPgn(text);
      setFileName(file.name);
    } catch {
      setError("The file could not be read.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const preset = presetById(presetId);

  return (
    <div className="space-y-6">
      <form
        className="space-y-4 rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit(pgn);
        }}
        noValidate
      >
        <div>
          <label htmlFor={textareaId} className="block text-sm font-semibold">
            Paste a PGN
          </label>
          <textarea
            id={textareaId}
            value={pgn}
            onChange={(e) => {
              setPgn(e.target.value);
              setFileName(null);
              if (error) setError(null);
            }}
            rows={9}
            spellCheck={false}
            placeholder={'[White "…"]\n[Black "…"]\n\n1. e4 e5 2. Nf3 Nc6 …'}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="mt-2 w-full resize-y rounded-md border border-line bg-background p-3 font-mono text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-line px-3 font-medium hover:bg-surface-2 focus-within:ring-2 focus-within:ring-accent/40">
              Choose a PGN file
              <input
                ref={fileRef}
                type="file"
                accept=".pgn,.txt,text/plain,application/x-chess-pgn"
                className="sr-only"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </label>
            {fileName && <span className="text-muted">Loaded {fileName}</span>}
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold">Analysis</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {ANALYSIS_PRESETS.map((p) => (
              <label
                key={p.id}
                className={`inline-flex min-h-11 cursor-pointer items-center rounded-md border px-3 text-sm font-medium ${
                  presetId === p.id ? "border-accent bg-accent/10" : "border-line hover:bg-surface-2"
                }`}
              >
                <input type="radio" name="preset" value={p.id} checked={presetId === p.id} onChange={() => setPresetId(p.id)} className="sr-only" />
                {p.label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">{preset.description}</p>
        </fieldset>

        {error && (
          <p id={errorId} role="alert" className="rounded-md bg-[#fef2f2] px-3 py-2 text-sm text-[#991b1b]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="min-h-12 w-full rounded-md bg-accent px-5 text-base font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60 sm:w-auto"
        >
          Review game
        </button>
      </form>

      <section aria-labelledby="samples-heading">
        <h2 id="samples-heading" className="text-sm font-semibold">
          Or try a famous game
        </h2>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {SAMPLE_GAMES.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => {
                  setPgn(g.pgn);
                  setFileName(null);
                  setError(null);
                }}
                className="h-full min-h-11 w-full rounded-md border border-line bg-surface p-3 text-left hover:bg-surface-2"
              >
                <span className="block text-sm font-medium">{g.title}</span>
                <span className="block text-xs text-muted">{g.subtitle}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
