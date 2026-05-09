import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Users,
  MessageSquare,
  BookOpen,
  Bot,
  CreditCard,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Button } from "../../components/ui/Button";

const features = [
  {
    icon: Shield,
    title: "Auth & Security",
    description:
      "JWT with refresh tokens, Google OAuth, rate limiting, CORS, and GDPR-compliant account management out of the box.",
  },
  {
    icon: Users,
    title: "Multi-Tenant",
    description:
      "Full tenant isolation with per-tenant feature flags, roles, and data boundaries. Scale from one to thousands.",
  },
  {
    icon: MessageSquare,
    title: "AI Chat",
    description:
      "Streaming chat powered by OpenAI with conversation history, context management, and cost tracking.",
  },
  {
    icon: BookOpen,
    title: "RAG Pipeline",
    description:
      "Upload documents and get AI answers grounded in your data. Powered by pgvector and a custom retrieval pipeline.",
  },
  {
    icon: Bot,
    title: "Agents",
    description:
      "ReAct agents with tool use via OpenAI Function Calling. No LangChain — clean, auditable, cost-tracked.",
  },
  {
    icon: CreditCard,
    title: "Billing",
    description:
      "Stripe integration with idempotent webhook processing, subscription lifecycle management, and usage limits.",
  },
];

const techStack = [
  "FastAPI",
  "React 18",
  "React Native",
  "PostgreSQL",
  "pgvector",
  "Redis",
  "Docker",
  "k3d",
  "Stripe",
  "OpenAI",
];

export default function Landing() {
  useEffect(() => {
    document.title = "OmarsApp — AI-First SaaS Starter";
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Nav */}
      <header className="border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-bold text-xl text-slate-900 dark:text-white">
            OmarsApp
          </span>
          <nav className="flex items-center gap-4">
            <Link
              to="/pricing"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link to="/login">
              <Button size="sm">Sign In</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
          <Zap className="w-3.5 h-3.5" />
          AI-First SaaS Starter
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white mb-6">
          Ship your SaaS in{" "}
          <span className="text-blue-600 dark:text-blue-400">
            days, not months
          </span>
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10">
          A production-ready template with Auth, Multi-Tenancy, AI Chat, RAG,
          Agents, and Billing pre-wired. Hexagonal architecture, strict
          TypeScript, full test coverage.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/login">
            <Button size="lg" className="gap-2">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/pricing">
            <Button size="lg" variant="secondary">
              See Pricing
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">
          Everything you need, pre-wired
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                {title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section className="max-w-6xl mx-auto px-6 py-12 border-t border-slate-200 dark:border-slate-800">
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6 uppercase tracking-widest font-medium">
          Tech Stack
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {techStack.map((tech) => (
            <span
              key={tech}
              className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium px-4 py-1.5 rounded-full"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-bold text-slate-900 dark:text-white">
            OmarsApp
          </span>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} Omar Fourati. All rights reserved.
          </p>
          <nav className="flex gap-4 text-sm text-slate-500 dark:text-slate-400">
            <Link
              to="/pricing"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              to="/login"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Login
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
