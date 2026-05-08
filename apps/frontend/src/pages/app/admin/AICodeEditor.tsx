import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Mic, MicOff, Send, Trash2, Code2 } from "lucide-react";
import { cn } from "../../../utils/cn";

const BASE_URL =
  typeof window !== "undefined"
    ? ((window as Window & { __API_URL__?: string }).__API_URL__ ?? "/api/v1")
    : "/api/v1";

// Web Speech API type declarations (not in standard TS DOM lib for all envs)
interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

interface ISpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: ISpeechRecognitionConstructor;
    webkitSpeechRecognition?: ISpeechRecognitionConstructor;
  }
}

export default function AICodeEditor() {
  useEffect(() => {
    document.title = "AI Code Editor — Admin";
  }, []);

  const [instruction, setInstruction] = useState("");
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Scroll output to bottom on new lines
  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output]);

  function startVoice() {
    const SpeechRecognitionAPI =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInstruction((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  function stopVoice() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  async function handleSend() {
    if (!instruction.trim() || isRunning) return;

    setIsRunning(true);
    setOutput([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${BASE_URL}/admin/ai-code/run`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: instruction.trim() }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const errText = await response.text().catch(() => response.statusText);
        setOutput([`[ERROR] ${errText}`]);
        setIsRunning(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              setIsRunning(false);
              return;
            }
            setOutput((prev) => [...prev, data]);
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setOutput((prev) => [...prev, `[ERROR] ${err.message}`]);
      }
    } finally {
      setIsRunning(false);
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setIsRunning(false);
  }

  function handleClear() {
    setOutput([]);
    setInstruction("");
  }

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Code2 className="w-6 h-6" />
          AI Code Editor
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Chat or voice → Claude CLI → live output stream
        </p>
      </div>

      {/* Input card */}
      <Card>
        <div className="flex flex-col gap-3">
          <label
            htmlFor="instruction"
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Instruction
          </label>
          <div className="relative">
            <textarea
              id="instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  handleSend();
                }
              }}
              placeholder="Describe what you want Claude to do… (Ctrl+Enter to send)"
              className={cn(
                "w-full h-24 resize-none rounded-xl border px-3 py-2 text-sm",
                "bg-white dark:bg-slate-900",
                "border-slate-200 dark:border-slate-700",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "placeholder:text-slate-400",
              )}
              disabled={isRunning}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Microphone button */}
            <button
              type="button"
              onClick={isListening ? stopVoice : startVoice}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-xl border transition-colors",
                isListening
                  ? "bg-red-100 border-red-300 text-red-600 dark:bg-red-900 dark:border-red-700 dark:text-red-400"
                  : "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:border-blue-400",
              )}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {isListening && (
              <span className="text-sm text-red-500 animate-pulse">
                Listening…
              </span>
            )}

            <div className="flex-1" />

            {/* Clear button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={isRunning}
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>

            {/* Send / Stop button */}
            {isRunning ? (
              <Button variant="danger" size="sm" onClick={handleStop}>
                Stop
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!instruction.trim()}
              >
                <Send className="w-4 h-4" />
                Run
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Terminal output */}
      <Card padding={false}>
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex-1">
            Output
          </h2>
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-blue-500 dark:text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Running…
            </span>
          )}
        </div>
        <div className="bg-slate-950 rounded-b-2xl min-h-48 max-h-[32rem] overflow-y-auto p-4 font-mono text-xs text-green-400 space-y-0.5">
          {output.length === 0 && !isRunning ? (
            <span className="text-slate-600">
              {"// Output will appear here…"}
            </span>
          ) : (
            output.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all leading-5">
                {line}
              </div>
            ))
          )}
          {isRunning && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-4 bg-green-400 animate-pulse" />
            </div>
          )}
          <div ref={outputEndRef} />
        </div>
      </Card>
    </div>
  );
}
