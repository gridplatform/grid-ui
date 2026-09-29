import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import TopologyDiagram from "@/components/TopologyDiagram";
import { useTopologyProviders } from "@/hooks/useGridApi";
import { layerLabels, layerOrder, type ResourceLayer } from "@/data/topologyTypes";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Shield, Network, Gauge, Box, Database, Loader2 } from "lucide-react";

const layerIcons: Record<ResourceLayer, React.ElementType> = {
  waf: Shield,
  network: Network,
  loadbalancer: Gauge,
  application: Box,
  data: Database,
};

const TopologyPage = () => {
  const { data: providers = [], isLoading, error } = useTopologyProviders();

  const [visibleLayers, setVisibleLayers] = useState<Set<ResourceLayer>>(
    () => new Set(layerOrder)
  );
  const [visibleProviders, setVisibleProviders] = useState<Set<string>>(new Set());

  useEffect(() => {
    setVisibleProviders(new Set(providers.map((p) => p.id)));
  }, [providers]);

  const toggleLayer = useCallback((layer: ResourceLayer) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      next.has(layer) ? next.delete(layer) : next.add(layer);
      return next;
    });
  }, []);

  const toggleProvider = useCallback((id: string) => {
    setVisibleProviders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const totalResources = providers.reduce((s, p) => s + p.totalResources, 0);
  const totalVpcs = providers.reduce((s, p) => s + p.vpcs.length, 0);
  const totalCritical = providers.reduce((s, p) => s + p.healthCounts.critical, 0);

  return (
    <AppShell activeTab="topology">
      <div className="flex h-[calc(100vh-56px)]">
        <div className="w-56 border-r border-border bg-card/50 p-4 space-y-6 flex-shrink-0 overflow-y-auto">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Live topology</span>
            </div>
            <div className="text-[11px] text-muted-foreground space-y-0.5">
              {isLoading ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading…
                </div>
              ) : (
                <>
                  <div>
                    <span className="text-foreground font-semibold">{totalResources}</span> resources
                  </div>
                  <div>
                    <span className="text-foreground font-semibold">{totalVpcs}</span> VPCs
                  </div>
                  {totalCritical > 0 && (
                    <div className="text-destructive">
                      <span className="font-semibold">{totalCritical}</span> critical
                    </div>
                  )}
                </>
              )}
            </div>
            {error && (
              <p className="text-[11px] text-destructive mt-1">
                {error instanceof Error ? error.message : "Failed to load topology"}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Providers
            </h3>
            <div className="space-y-1.5">
              {!isLoading && providers.length === 0 && (
                <p className="text-[11px] text-muted-foreground">No providers yet.</p>
              )}
              {providers.map((p) => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
                  <Checkbox
                    checked={visibleProviders.has(p.id)}
                    onCheckedChange={() => toggleProvider(p.id)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs text-foreground group-hover:text-primary transition-colors">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{p.vpcs.length}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Entities
            </h3>
            <div className="space-y-1.5">
              {layerOrder.map((layer) => {
                const Icon = layerIcons[layer];
                return (
                  <label key={layer} className="flex items-center gap-2 cursor-pointer group">
                    <Checkbox
                      checked={visibleLayers.has(layer)}
                      onCheckedChange={() => toggleLayer(layer)}
                      className="h-3.5 w-3.5"
                    />
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-foreground group-hover:text-primary transition-colors">
                      {layerLabels[layer]}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Health Status
            </h3>
            <div className="space-y-1">
              {[
                { label: "Healthy", cls: "bg-[hsl(var(--success))]" },
                { label: "Warning", cls: "bg-[hsl(var(--warning))]" },
                { label: "Critical", cls: "bg-destructive" },
              ].map(({ label, cls }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${cls}`} />
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground leading-relaxed border-t border-border pt-3">
            Click a VPC bubble to expand · Hover a resource to see connections
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {!isLoading && providers.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No topology data. Sync infrastructures from config root, then refresh.
            </div>
          ) : (
            <TopologyDiagram
              providers={providers}
              visibleLayers={visibleLayers}
              visibleProviders={visibleProviders}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default TopologyPage;
