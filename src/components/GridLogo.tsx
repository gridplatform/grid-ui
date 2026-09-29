import gridLogo from "@/assets/grid-logo.svg";

type GridLogoProps = {
  className?: string;
  alt?: string;
};

/** Default Grid brand mark (from grid-operations-clarity). */
export function GridLogo({ className = "w-8 h-8", alt = "Grid" }: GridLogoProps) {
  return <img src={gridLogo} alt={alt} className={`${className} object-contain`} />;
}
