/** Formats. Everything else in the compositions is relative to the frame. */
export const FPS = 30;

export const REEL = { width: 1080, height: 1920 } as const;
export const WIDE = { width: 1920, height: 1080 } as const;
export const CARD = { width: 1080, height: 1350 } as const;

/** Far enough into the card composition that every line has landed. */
export const CARD_FRAMES = 60;
