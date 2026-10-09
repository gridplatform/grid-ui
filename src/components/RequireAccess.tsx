import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AccessDeniedPage from "@/pages/AccessDeniedPage";
import { canAccessFeature, canManageUsers } from "@/lib/rbac";
import type { FeatureKey } from "@/config/features";

type Props = {
  children: ReactNode;
  /** Product feature / domain gate. */
  feature?: FeatureKey;
  /** Require admin or superadmin (Admin console). */
  admin?: boolean;
};

/**
 * Route guard: role (admin) and/or domain access from /auth/me.
 * Shows Access denied instead of the page content.
 */
export function RequireAccess({ children, feature, admin }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (admin) {
    if (!canManageUsers(user?.role)) {
      return (
        <AccessDeniedPage
          title="You are not authorized to see that"
          message="The Admin console requires the admin or superadmin role. Custom groups grant project access in the product — they do not unlock Admin."
          withShell={false}
        />
      );
    }
    return <>{children}</>;
  }

  if (feature && !canAccessFeature(user, feature)) {
    return (
      <AccessDeniedPage
        title="Access denied"
        message={`You don’t have access to ${feature}. Ask an admin to assign a predefined role (developer / maintainer / admin) or add you to a custom group that includes this area.`}
      />
    );
  }

  return <>{children}</>;
}
