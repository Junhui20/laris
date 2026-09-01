import type { StateCode, stay } from "@laris/schema";

/**
 * Display names for values the schema stores as codes.
 *
 * Two audiences, two spellings, which is why these are separate maps rather
 * than one: the page is written for a guest in Chinese, while the JSON-LD is
 * written for Google and has to carry the official Malay/English name.
 *
 * mycal owns state *aliases* and weekend groups, not this. Its state records
 * carry `name.ms` and `name.en` only — there is no Chinese name upstream, and
 * a page that says "perak" to a Chinese reader is not a calendar problem.
 */

/** As a guest reading Chinese would write it. */
const STATE_ZH: Readonly<Record<StateCode, string>> = {
  johor: "柔佛",
  kedah: "吉打",
  kelantan: "吉兰丹",
  melaka: "马六甲",
  "negeri-sembilan": "森美兰",
  pahang: "彭亨",
  perak: "霹雳",
  perlis: "玻璃市",
  "pulau-pinang": "槟城",
  sabah: "沙巴",
  sarawak: "砂拉越",
  selangor: "雪兰莪",
  terengganu: "登嘉楼",
  "kuala-lumpur": "吉隆坡",
  labuan: "纳闽",
  putrajaya: "布城",
};

/** Official spelling, for `addressRegion` in structured data. */
const STATE_OFFICIAL: Readonly<Record<StateCode, string>> = {
  johor: "Johor",
  kedah: "Kedah",
  kelantan: "Kelantan",
  melaka: "Melaka",
  "negeri-sembilan": "Negeri Sembilan",
  pahang: "Pahang",
  perak: "Perak",
  perlis: "Perlis",
  "pulau-pinang": "Pulau Pinang",
  sabah: "Sabah",
  sarawak: "Sarawak",
  selangor: "Selangor",
  terengganu: "Terengganu",
  "kuala-lumpur": "Wilayah Persekutuan Kuala Lumpur",
  labuan: "Wilayah Persekutuan Labuan",
  putrajaya: "Wilayah Persekutuan Putrajaya",
};

const AMENITY_ZH: Readonly<Record<stay.Amenity, string>> = {
  wifi: "WiFi",
  aircon: "冷气",
  parking: "停车位",
  pool: "泳池",
  kitchen: "厨房",
  washer: "洗衣机",
  tv: "电视",
  workspace: "办公桌",
  bbq: "烧烤炉",
  seaview: "海景",
  "pet-friendly": "可带宠物",
  "halal-kitchen": "清真厨房",
  "prayer-mat": "祈祷毯",
};

const AMENITY_EN: Readonly<Record<stay.Amenity, string>> = {
  wifi: "Wi-Fi",
  aircon: "Air conditioning",
  parking: "Free parking",
  pool: "Swimming pool",
  kitchen: "Kitchen",
  washer: "Washing machine",
  tv: "Television",
  workspace: "Dedicated workspace",
  bbq: "Barbecue",
  seaview: "Sea view",
  "pet-friendly": "Pet friendly",
  "halal-kitchen": "Halal kitchen",
  "prayer-mat": "Prayer mat",
};

export const stateZh = (code: StateCode): string => STATE_ZH[code] ?? code;
export const stateOfficial = (code: StateCode): string => STATE_OFFICIAL[code] ?? code;
export const amenityZh = (a: stay.Amenity): string => AMENITY_ZH[a] ?? a;
export const amenityEn = (a: stay.Amenity): string => AMENITY_EN[a] ?? a;
