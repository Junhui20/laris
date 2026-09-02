/**
 * The one place a number that affects how this looks is allowed to live.
 *
 * `docs/strategy.md` is explicit that we are not building a timeline editor:
 * quality has to come from templates driven by parameters, so the parameters
 * have to be legible in one screen rather than scattered through JSX.
 */
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** 4:5 — what Facebook and 小红书 give the most room to. */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

export const PAD = 84;

/** Photograph fills the top of the frame in `panel` layout. */
export const PHOTO_SIZE = WIDTH;

/** Frames the still is rendered at: far enough in that the entrance has landed. */
export const CARD_FRAMES = 60;
export const CARD_STILL_FRAME = 45;
