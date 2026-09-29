import { useState } from "react";
import AppShell from "@/components/AppShell";
import { FileText, Search } from "lucide-react";
import { useLogs } from "@/hooks/useGridApi";

const LoggingPage = () => {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const { data: logs = [], isLoading, error, refetch } = useLogs({
    query: submitted || undefined,
    limit: 100,
  });

  const handleSearch = () => {
    setSubmitted(query.trim());
    void refetch();
  };

  return (
    <AppShell activeTab="logging">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Logging
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Query logs from grid-core. Empty until a logging backend is connected.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="LogQL / search query…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90"
          >
            Search
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error instanceof Error ? error.message : "Failed to load logs"}
          </div>
        )}

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Log stream</h2>
            <span className="text-xs text-muted-foreground">
              {isLoading ? "loading…" : `${logs.length} entries`}
            </span>
          </div>
          {!isLoading && logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No log entries.
            </div>
          ) : (
            <pre className="max-h-[60vh] overflow-auto bg-background p-3 text-[11px] leading-relaxed font-mono text-muted-foreground whitespace-pre-wrap">
              {logs.map((entry, i) => (
                <div key={`${entry.timestamp}-${i}`}>
                  <span className="text-foreground/70">{entry.timestamp}</span>{" "}
                  <span className="uppercase">{entry.level}</span>{" "}
                  {entry.service ? `[${entry.service}] ` : ""}
                  {entry.message}
                </div>
              ))}
            </pre>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default LoggingPage;
