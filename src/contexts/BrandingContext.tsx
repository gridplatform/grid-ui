import { createContext, useContext, useState, ReactNode } from "react";

interface BrandingState {
  customLogoUrl: string | null;
  orgName: string;
  setCustomLogoUrl: (url: string | null) => void;
  setOrgName: (name: string) => void;
}

const BrandingContext = createContext<BrandingState>({
  customLogoUrl: null,
  orgName: "Grid",
  setCustomLogoUrl: () => {},
  setOrgName: () => {},
});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("Grid");

  return (
    <BrandingContext.Provider value={{ customLogoUrl, orgName, setCustomLogoUrl, setOrgName }}>
      {children}
    </BrandingContext.Provider>
  );
};
