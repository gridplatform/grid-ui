import { Navigate } from 'react-router-dom';
import { isProductEnabled, type FeatureKey } from '@/config/features';

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  if (isProductEnabled(feature)) {
    return <>{children}</>;
  }
  if (fallback !== undefined) {
    return <>{fallback}</>;
  }
  return <Navigate to="/dashboard" replace />;
}
