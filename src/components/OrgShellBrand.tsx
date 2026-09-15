import { cn } from "@/lib/cn";
import { VERSION_BADGE } from "@/lib/uiChrome";
import { BRAND_PRODUCT_CAPTION, BRAND_WORDMARK } from "@/lib/uiTypography";

type OrgShellBrandProps = {
  companyName: string;
  productName: string;
  version?: string;
  compact?: boolean;
  className?: string;
};

/** Wordmark organizacji w shellu admin/worker — nazwa firmy jak WERKIT, produkt małym drukiem. */
export function OrgShellBrand({
  companyName,
  productName,
  version,
  compact = false,
  className,
}: OrgShellBrandProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex min-w-0 items-center gap-2">
        <h1
          className={cn(BRAND_WORDMARK, "min-w-0 truncate uppercase leading-none")}
          title={companyName}
        >
          {companyName}
        </h1>
        {version ? (
          <span className={cn(compact ? "text-[9px]" : "text-[10px]", VERSION_BADGE, "shrink-0")}>
            v{version}
          </span>
        ) : null}
      </div>
      <p className={BRAND_PRODUCT_CAPTION}>{productName.toLowerCase()}</p>
    </div>
  );
}
