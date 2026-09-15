import { cn } from "@/lib/cn";
import { BRAND_PRODUCT_CAPTION, BRAND_WORDMARK } from "@/lib/uiTypography";

type OrgShellBrandProps = {
  companyName: string;
  productName: string;
  version?: string;
  className?: string;
};

/** Wordmark organizacji w shellu admin/worker — nazwa firmy jak WERKIT, produkt i build małym drukiem. */
export function OrgShellBrand({
  companyName,
  productName,
  version,
  className,
}: OrgShellBrandProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <h1
        className={cn(BRAND_WORDMARK, "min-w-0 truncate uppercase leading-none")}
        title={companyName}
      >
        {companyName}
      </h1>
      <p className={cn(BRAND_PRODUCT_CAPTION, "flex min-w-0 items-center gap-1.5")}>
        <span>{productName.toLowerCase()}</span>
        {version ? <span className="truncate">v{version}</span> : null}
      </p>
    </div>
  );
}
