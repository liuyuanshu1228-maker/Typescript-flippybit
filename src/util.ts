import { Bit, BitRow } from "./types";

/**
 * Returns a new array with the element at `index` replaced by
 * `updater(oldValue)`; every other element is left untouched.
 *
 * Deliberately generic (not tied to Bit/BitRow) so the same immutable
 * "update one element" logic can be reused anywhere it's needed later.
 */
export const updateAt = <T>(
    arr: ReadonlyArray<T>,
    index: number,
    updater: (value: T) => T,
): ReadonlyArray<T> =>
    arr.map((item, i) => (i === index ? updater(item) : item));

/**
 * Converts an 8-bit row (MSB first) into its decimal value (0-255).
 */
export const bitsToValue = (bits: BitRow): number =>
    bits.reduce<number>((acc, bit) => acc * 2 + bit, 0);

/**
 * Formats a 0-255 value as a 2-digit uppercase hex string,
 * e.g. valueToHex(10) -> "0A".
 */
export const valueToHex = (value: number): string =>
    value.toString(16).toUpperCase().padStart(2, "0");

/**
 * Toggles a single bit between 0 and 1.
 */
export const toggleBitValue = (bit: Bit): Bit => (bit === 0 ? 1 : 0);

/**
 * One step of a linear congruential generator (LCG), the same
 * technique used by the Asteroids example's RNG. Pure: the same
 * seed always produces the same next seed, which is what makes any
 * Observable built on top of it reproducible and therefore testable
 * - unlike calling Math.random() directly inside the stream.
 */
export const nextSeed = (seed: number): number =>
    (1103515245 * seed + 12345) % 0x80000000;

/**
 * Scales a raw seed into the half-open interval [0, 1), the same
 * range Math.random() returns. Kept as its own function (rather than
 * inlined at each call site) so every consumer scales seeds the same
 * way.
 */
export const seedToUnitInterval = (seed: number): number =>
    Math.abs(seed) / 0x80000000;
