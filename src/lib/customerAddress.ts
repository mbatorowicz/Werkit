/** Trzy segmenty adresu klienta / lokalizacji (kolejność: ulica → miejscowość → kod). */
export type CustomerAddressParts = {
  street: string;
  city: string;
  postalCode: string;
};

const PL_POSTAL_RE = /\b(\d{2}-\d{3})\b/;

/** Zapis w DB: 3 linie (ulica, miejscowość, kod pocztowy). */
export function serializeCustomerAddress(parts: CustomerAddressParts): string | null {
  const street = parts.street.trim();
  const city = parts.city.trim();
  const postalCode = parts.postalCode.trim();
  if (!street && !city && !postalCode) return null;
  return [street, city, postalCode].join("\n");
}

/** Jedna linia do geokodowania / wyszukiwarki. */
export function customerAddressGeocodeQuery(parts: CustomerAddressParts): string {
  const street = parts.street.trim();
  const city = parts.city.trim();
  const postal = parts.postalCode.trim();
  const cityLine = [postal, city].filter(Boolean).join(" ").trim();
  return [street, cityLine].filter(Boolean).join(", ");
}

/** Czytelny podgląd (np. modal, tabela) — linie: ulica, miejscowość, kod. */
export function formatCustomerAddressDisplay(raw: string | null | undefined): string {
  const p = parseCustomerAddress(raw);
  const lines = [p.street, p.city, p.postalCode].filter((x) => x.trim());
  return lines.length ? lines.join("\n") : "";
}

export function parseCustomerAddress(raw: string | null | undefined): CustomerAddressParts {
  const s = raw?.trim() ?? "";
  if (!s) return { street: "", city: "", postalCode: "" };

  const lines = s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 3) {
    return {
      street: lines[0],
      city: lines[1],
      postalCode: lines[2],
    };
  }
  if (lines.length === 2) {
    const postalMatch = lines[1].match(PL_POSTAL_RE);
    if (postalMatch) {
      const postalCode = postalMatch[1];
      const city = lines[1].replace(postalMatch[0], "").replace(/^[,\s]+|[,\s]+$/g, "").trim();
      return { street: lines[0], city, postalCode };
    }
    return { street: lines[0], city: lines[1], postalCode: "" };
  }

  const commaParts = s.split(",").map((p) => p.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    const last = commaParts[commaParts.length - 1];
    const postalMatch = last.match(PL_POSTAL_RE);
    if (postalMatch) {
      const postalCode = postalMatch[1];
      const afterPostal = last.replace(postalMatch[0], "").trim();
      const city = afterPostal || commaParts[commaParts.length - 2] || "";
      const street = commaParts.slice(0, -1).join(", ").replace(postalMatch[0], "").trim() || commaParts[0];
      if (commaParts.length === 2 && !afterPostal) {
        return { street: commaParts[0], city: "", postalCode };
      }
      return {
        street: commaParts.slice(0, -1).join(", ").trim() || commaParts[0],
        city: afterPostal || commaParts[commaParts.length - 2] || "",
        postalCode,
      };
    }
  }

  const inlinePostal = s.match(PL_POSTAL_RE);
  if (inlinePostal && commaParts.length >= 2) {
    const postalCode = inlinePostal[1];
    const street = commaParts[0];
    const city = commaParts
      .slice(1)
      .join(", ")
      .replace(inlinePostal[0], "")
      .trim();
    return { street, city, postalCode };
  }

  return { street: s, city: "", postalCode: "" };
}
