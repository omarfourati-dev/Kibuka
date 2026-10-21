import { useState } from "react";
import { Play, ChevronDown, ChevronUp, Terminal } from "lucide-react";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";

const AVAILABLE_TOOLS = ["web_search", "rag_search", "execute_code"];

interface AgentStep {
  type: "thought" | "tool_call" | "observation" | "final";
  content: string;
  toolName?: string;
}

export function AgentRunner({ spaceId }: { spaceId: string }) {
  const [task, setTask] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>(["web_search"]);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [expanded, setExpanded] = useState<boolean>(true);

  const toggleTool = (tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool],
    );
  };

  const runAgent = async () => {
    if (!task.trim() || isRunning) return;
    setIsRunning(true);
    setSteps([]);
    try {
      const res = await fetch("/api/v1/ai/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, space_id: spaceId, tools: selectedTools }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.steps) setSteps(data.steps);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder='Describe the task, e.g. "Research the best FastAPI deployment strategies and summarize"'
          className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 flex-wrap">
          {AVAILABLE_TOOLS.map((tool) => (
            <button
              key={tool}
              onClick={() => toggleTool(tool)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedTools.includes(tool)
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {tool}
            </button>
          ))}
        </div>
        <Button onClick={runAgent} loading={isRunning} className="w-full">
          <Play className="w-4 h-4" />
          {isRunning ? "Agent is running..." : "Run Agent"}
        </Button>
      </div>

      {steps.length > 0 && (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 text-sm font-medium"
          >
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Agent Steps ({steps.length})
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {expanded && (
            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
              {steps.map((step, i) => (
                <div key={i} className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        step.type === "final"
                          ? "success"
                          : step.type === "tool_call"
                            ? "info"
                            : "default"
                      }
                    >
                      {step.type}
                    </Badge>
                    {step.toolName && (
                      <span className="text-slate-500">{step.toolName}</span>
                    )}
                  </div>
                  <pre className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                    {step.content}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
