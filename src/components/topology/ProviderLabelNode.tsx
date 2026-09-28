import { memo } from "react";
import { type NodeProps } from "@xyflow/react";

const ProviderLabelNode = ({ data }: NodeProps) => {
  const d = data as any;
  return (
    <div className="flex items-center gap-3 select-none pointer-events-none">
      <span className="text-base font-bold text-foreground tracking-tight">{d.label}</span>
      <span className="text-xs text-muted-foreground">
        {d.vpcCount} VPCs · {d.totalResources} resources
      </span>
      {d.healthCounts?.critical > 0 && (
        <span className="text-xs text-destructive font-medium">{d.healthCounts.critical} critical</span>
      )}
    </div>
  );
};

export default memo(ProviderLabelNode);
