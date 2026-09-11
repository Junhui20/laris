import type { BusinessContext } from "@laris/schema";

/**
 * A complete, realistic Business Context so a fresh clone runs with no
 * credentials and no database. `pnpm dev:api` then `/site/rumah-ombak` shows a
 * finished Merchant Site immediately.
 *
 * This is placeholder content for a plausible Penang homestay. Swap it for a
 * real merchant before anything ships — and when you do, keep a fixture here.
 * Being able to render without Supabase is what makes the renderer testable.
 */
export const rumahOmbak: BusinessContext = {
  merchantId: "11111111-1111-4111-8111-111111111111",
  accountId: "22222222-2222-4222-8222-222222222222",
  vertical: "stay",

  identity: {
    name: "Rumah Ombak",
    addressLines: ["Jalan Batu Ferringhi"],
    area: "Batu Ferringhi",
    postcode: "11100",
    // Fixes public holidays and the weekend group. Penang is Kumpulan B.
    state: "pulau-pinang",
    geo: { lat: 5.4726, lng: 100.2503 },
    phone: "+60123456789",
    whatsapp: "+60123456789",
    sameAs: [],
    hours: [],
  },

  verticalProfile: {
    stay: {
      landmarks: [
        { name: "Batu Ferringhi 海滩", walkMin: 6 },
        { name: "Batu Ferringhi 夜市", walkMin: 10 },
        { name: "Teluk Bahang 水坝", driveMin: 12 },
        { name: "升旗山 Penang Hill", driveMin: 25 },
        { name: "槟城国际机场", driveMin: 45 },
      ],
      otaListings: [
        { platform: "agoda", url: "https://www.agoda.com/", commissionPct: 18 },
        { platform: "airbnb", url: "https://www.airbnb.com/", commissionPct: 15 },
      ],
    },
  },

  theme: {
    layout: "gallery-first",
    accent: "#10665A",
    typePair: "display-serif",
    density: "airy",
  },

  offerings: [
    {
      id: "bilik-laut",
      kind: "room_type",
      name: "Bilik Laut",
      description: "海景房 · 一张大床 + 一张单人床",
      capacityPax: 4,
      isWholePlace: false,
      baseRateCents: 25000,
      rateCalendar: [
        {
          from: "2026-12-20",
          to: "2027-01-02",
          rateCents: 38000,
          label: "学校假期",
          derived: true,
        },
      ],
      minNights: 2,
      checkin: "15:00",
      checkout: "12:00",
      amenities: ["aircon", "wifi", "seaview"],
      photos: [],
      otaRateCents: 29000,
      directDiscountPct: 0,
      isSignature: true,
    },
    {
      id: "bilik-kebun",
      kind: "room_type",
      name: "Bilik Kebun",
      description: "园景房 · 一张大床",
      capacityPax: 2,
      isWholePlace: false,
      baseRateCents: 18000,
      rateCalendar: [
        {
          from: "2026-12-20",
          to: "2027-01-02",
          rateCents: 28000,
          label: "学校假期",
          derived: true,
        },
      ],
      minNights: 2,
      checkin: "15:00",
      checkout: "12:00",
      amenities: ["aircon", "wifi"],
      photos: [],
      otaRateCents: 21000,
      directDiscountPct: 0,
      isSignature: false,
    },
  ],

  calendar: [
    {
      date: "2026-09-16",
      kind: "public_holiday",
      name: { ms: "Hari Malaysia", en: "Malaysia Day", zh: "马来西亚日" },
      states: ["*"],
      source: "mycal",
    },
  ],

  faq: [
    {
      q: "有停车位吗？",
      a: "有，屋前可以停两辆车，免费。旅游旺季街边也还找得到位子。",
      source: "comments",
    },
    {
      q: "厨房可以用吗？",
      a: "可以用，锅碗瓢盆、冰箱、电磁炉都齐全。厨房没有分开煮清真食物的器具，介意的话可以先跟我们说，我们帮你准备。",
      source: "comments",
    },
    {
      q: "可以加床吗？",
      a: "可以，海景房能多加一张地铺，每晚 RM 40，最多加两个人。订房时先讲一声就好。",
      source: "comments",
    },
    {
      q: "几点可以入住？",
      a: "下午三点之后。早到可以先把行李放在客厅，我们就住隔壁，WhatsApp 叫一声就来开门。",
      source: "comments",
    },
    {
      q: "WiFi 快不快？",
      a: "光纤 100Mbps，客厅和两间房都收得到。露台有插座，很多客人在那里开会。",
      source: "merchant",
    },
  ],

  watchlist: [],
  photos: [],
  updatedAt: "2026-08-30T00:00:00.000Z",
};
