import { z } from "zod";
import { Cents, IsoDate, LocalTime, Photo } from "../common.js";

/**
 * `stay` — accommodation: homestay, guesthouse, chalet, boutique hotel.
 *
 * Three things make this vertical different from the others, and all three are
 * encoded below rather than left to convention:
 *
 * 1. The calendar sets the price. School terms and public holidays are not
 *    context for a promo, they move the nightly rate. Hence `rateCalendar`.
 * 2. `leads` means an availability check or a direct-booking click, never a view.
 * 3. The value proposition is saved commission, not exposure. OTAs take 15–20%,
 *    so `otaListings` and `directDiscountPct` are what make the ROI computable —
 *    they are sales material, not bookkeeping.
 */

export const OtaPlatform = z.enum(["airbnb", "agoda", "booking", "traveloka", "other"]);
export type OtaPlatform = z.infer<typeof OtaPlatform>;

export const OtaListing = z.object({
  platform: OtaPlatform,
  url: z.string().url(),
  /**
   * Commission taken by the platform. The single most persuasive number we hold:
   * every direct booking is this percentage kept rather than earned.
   */
  commissionPct: z.number().min(0).max(100),
});
export type OtaListing = z.infer<typeof OtaListing>;

export const Landmark = z.object({
  name: z.string(),
  walkMin: z.number().int().positive().optional(),
  driveMin: z.number().int().positive().optional(),
});

/** Extends `profile` when vertical is `stay`. */
export const StayProfile = z.object({
  landmarks: z.array(Landmark).default([]),
  otaListings: z.array(OtaListing).default([]),
  /** MOTAC registration, where applicable. */
  licenseNo: z.string().optional(),
});
export type StayProfile = z.infer<typeof StayProfile>;

/**
 * A dated rate override. Generated from mycal school terms and public holidays,
 * then adjusted by the owner — not hand-maintained from scratch.
 */
export const RateOverride = z.object({
  from: IsoDate,
  to: IsoDate,
  rateCents: Cents,
  /** Why the rate moves: "school holiday", "CNY", "Merdeka long weekend". */
  label: z.string(),
  /** True when this window came from the calendar rather than the owner. */
  derived: z.boolean().default(false),
});
export type RateOverride = z.infer<typeof RateOverride>;

export const Amenity = z.enum([
  "wifi",
  "aircon",
  "parking",
  "pool",
  "kitchen",
  "washer",
  "tv",
  "workspace",
  "bbq",
  "seaview",
  "pet-friendly",
  "halal-kitchen",
  "prayer-mat",
]);
export type Amenity = z.infer<typeof Amenity>;

/** An offering in the `stay` vertical is a room type, not a menu item. */
export const RoomType = z.object({
  id: z.string(),
  kind: z.literal("room_type"),
  name: z.string(),
  description: z.string().optional(),
  capacityPax: z.number().int().positive(),
  baseRateCents: Cents,
  rateCalendar: z.array(RateOverride).default([]),
  minNights: z.number().int().positive().default(1),
  checkin: LocalTime.default("15:00"),
  checkout: LocalTime.default("12:00"),
  amenities: z.array(Amenity).default([]),
  photos: z.array(Photo).default([]),
  /** What the OTAs show. Compared against base rate to prove the direct saving. */
  otaRateCents: Cents.optional(),
  /** Discount offered for booking direct instead of through an OTA. */
  directDiscountPct: z.number().min(0).max(100).optional(),
  isSignature: z.boolean().default(false),
});
export type RoomType = z.infer<typeof RoomType>;

/**
 * Commission saved by taking a booking direct rather than through an OTA.
 * This is the number the owner actually feels, so it is computed, never estimated.
 */
export function directBookingSavingCents(room: RoomType, listing: OtaListing): number {
  const otaRate = room.otaRateCents ?? room.baseRateCents;
  const commission = Math.round((otaRate * listing.commissionPct) / 100);
  const discount = Math.round((room.baseRateCents * (room.directDiscountPct ?? 0)) / 100);
  return commission - discount;
}
