import { ShieldOff } from "lucide-react";

type Props = {
  /** Short name of the section, e.g. "Users", "Groups", "Audit". */
  section: string;
};

/**
 * Shown when a signed-in user opens an Admin surface that requires
 * admin / superadmin. Custom groups grant project×env access, not this console.
 */
export function AdminAccessDenied({ section }: Props) {
  return (
    <div className="p-10 text-center space-y-3 max-w-lg mx-auto">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted">
        <ShieldOff className="w-5 h-5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium text-foreground">
        You don’t have access to {section}
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        This requires the <span className="font-mono text-foreground">admin</span> or{" "}
        <span className="font-mono text-foreground">superadmin</span> role.
        Custom groups grant project and environment access in the product — they do
        not unlock Admin console management. Ask an admin to elevate your role if
        you need this.
      </p>
    </div>
  );
}
