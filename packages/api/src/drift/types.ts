import type { OpeningHours } from "@laris/schema";

export type EvidenceSource = "json-ld" | "microdata" | "meta" | "text";
export type EvidenceConfidence = "certain" | "likely";

export type ExtractedValue<T> = {
  value: T;
  raw: string;
  source: EvidenceSource;
  confidence: EvidenceConfidence;
};

export type ExtractedAddress = {
  streetAddress?: string;
  area?: string;
  postcode?: string;
  state?: string;
};

export type ExtractedIdentity = {
  name?: ExtractedValue<string>;
  phone?: ExtractedValue<string>;
  address?: ExtractedValue<ExtractedAddress>;
  hours?: ExtractedValue<OpeningHours[]>;
};
