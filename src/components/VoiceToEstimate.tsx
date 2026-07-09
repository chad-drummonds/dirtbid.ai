/**
 * VoiceToEstimate.tsx — Voice input component for the Ballpark Estimator.
 *
 * Uses the browser's Web Speech API (SpeechRecognition) to capture
 * natural-language excavation descriptions, parses them semantically,
 * and auto-populates the estimator form.
 *
 * Designed for use in the truck cab: big button, clear feedback,
 * works on mobile Chrome.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { parseVoiceInput, type ParsedVoiceInput } from "~/lib/voiceParser";
import type { ProjectType, SoilType } from "./BallparkEstimator";

// ── Types ────────────────────────────────────────────────────────────

export interface VoiceEstimateData {
  projectType: ProjectType | null;
  length: number | null;
  width: number | null;
  depth: number | null;
  soilType: SoilType | null;
  projectName: string | null;
}

interface Props {
  /** Called when the user has finished speaking and data was parsed */
  onEstimateData: (data: VoiceEstimateData) => void;
}

// ── Speech Recognition Setup ─────────────────────────────────────────

// Get the browser's SpeechRecognition constructor
const SpeechRecognition =
  (typeof window !== "undefined" &&
    (window.SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
  null;

type RecognitionState = "idle" | "listening" | "processing" | "error" | "unsupported";

// ── Component ────────────────────────────────────────────────────────

export default function VoiceToEstimate({ onEstimateData }: Props) {
  const [state, setState] = useState<RecognitionState>(
    SpeechRecognition ? "idle" : "unsupported",
  );
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState<ParsedVoiceInput | null>(null);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setState("unsupported");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setState("listening");
        setTranscript("");
        setParsed(null);
        setInterimText("");
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        if (final) {
          setTranscript(final);
        }
        setInterimText(interim);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "no-speech") {
          setState("idle");
        } else if (event.error === "aborted") {
          setState("idle");
        } else {
          setState("error");
          setTimeout(() => setState("idle"), 2000);
        }
      };

      recognition.onend = () => {
        // Get the final transcript
        const finalText = transcript || interimText;
        if (finalText.trim()) {
          setState("processing");
          const result = parseVoiceInput(finalText);
          setParsed(result);

          // Auto-populate after a brief delay for user to see the result
          setTimeout(() => {
            onEstimateData({
              projectType: result.projectType,
              length: result.length,
              width: result.width,
              depth: result.depth,
              soilType: result.soilType,
              projectName: result.projectName,
            });
            setState("idle");
          }, 1500);
        } else {
          setState("idle");
        }
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }, [transcript, interimText, onEstimateData]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setState("idle");
  }, []);

  const toggleListening = () => {
    if (state === "listening") {
      stopListening();
    } else {
      startListening();
    }
  };

  // ── Unsupported browser ──
  if (state === "unsupported") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-700">
        <p className="font-medium">🎤 Voice input not supported</p>
        <p className="mt-1 text-xs text-amber-600">
          Try Chrome on desktop or Android. Safari support is limited.
        </p>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="space-y-3">
      {/* Mic button — big, high-contrast, easy to tap in a truck cab */}
      <button
        type="button"
        onClick={toggleListening}
        disabled={state === "processing"}
        className={`
          relative mx-auto flex h-16 w-16 items-center justify-center rounded-full
          shadow-lg transition-all duration-200
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500
          disabled:opacity-50
          ${
            state === "listening"
              ? "bg-red-600 text-white scale-110 shadow-red-300 animate-pulse"
              : "bg-amber-600 text-white hover:bg-amber-700 hover:scale-105"
          }
        `}
        title={
          state === "listening"
            ? "Tap to stop recording"
            : "Tap to describe your project"
        }
      >
        {/* Mic icon */}
        <svg
          className={`h-8 w-8 ${state === "listening" ? "animate-bounce" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
          />
        </svg>

        {/* Ripple effect when listening */}
        {state === "listening" && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
            <span className="absolute inset-[-4px] rounded-full border-2 border-red-400 animate-ping opacity-30" style={{ animationDelay: "0.3s" }} />
          </>
        )}
      </button>

      {/* State label */}
      <div className="text-center">
        {state === "idle" && (
          <p className="text-xs text-gray-500">
            Tap the mic and say, e.g.,{" "}
            <span className="italic text-amber-600">
              "Smith's driveway, 50 by 12 feet, clay soil"
            </span>
          </p>
        )}
        {state === "listening" && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-red-600">Listening...</p>
            {interimText && (
              <p className="text-xs italic text-gray-500">&quot;{interimText}&quot;</p>
            )}
          </div>
        )}
        {state === "processing" && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-600">Processing...</p>
            {transcript && (
              <p className="text-xs italic text-gray-600">&quot;{transcript}&quot;</p>
            )}
          </div>
        )}
        {state === "error" && (
          <p className="text-sm font-medium text-red-600">
            Could not recognize speech. Try again.
          </p>
        )}
      </div>

      {/* Parsed result display */}
      {parsed && state === "processing" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
          <p className="font-medium text-green-800">{parsed.summary}</p>
          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-green-700">
            {parsed.projectName && (
              <span>Project: <strong>{parsed.projectName}</strong></span>
            )}
            {parsed.projectType && (
              <span>Type: <strong>{parsed.projectType}</strong></span>
            )}
            {parsed.length && parsed.width && (
              <span>
                Size: <strong>{parsed.length}' × {parsed.width}'{parsed.depth ? ` × ${parsed.depth}'` : ""}</strong>
              </span>
            )}
            {parsed.soilType && (
              <span>Soil: <strong>{parsed.soilType}</strong></span>
            )}
          </div>
          {parsed.confidence < 0.4 && (
            <p className="mt-1 text-xs text-amber-600">
              Low confidence — please review the auto-filled values.
            </p>
          )}
        </div>
      )}
    </div>
  );
}