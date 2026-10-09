import { ShieldOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminLike } from "@/lib/rbac";

type Props = {
  title?: string;
  message?: string;
  /** When true, wrap in AppShell so nav still works for allowed areas. */
  withShell?: boolean;
};

export default function AccessDeniedPage({
  title = "Access denied",
  message = "You are not authorized to see that. Ask an admin to grant the right role or add you to a custom group with access to this area.",
  withShell = true,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const body = (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted">
        <ShieldOff className="w-6 h-6 text-muted-foreground" />
      </div>
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground max-w-md leading-relaxed">{message}</p>
      {user && (
        <p className="text-xs text-muted-foreground">
          Signed in as <span className="font-mono">{user.email}</span> ({user.role})
        </p>
      )}
      <Button type="button" variant="secondary" onClick={() => navigate("/dashboard")}>
        Back to overview
      </Button>
    </div>
  );

  if (!withShell) {
    return <div className="min-h-screen bg-background">{body}</div>;
  }

  return <AppShell isAdmin={isAdminLike(user?.role)}>{body}</AppShell>;
}
