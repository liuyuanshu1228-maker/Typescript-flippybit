import { describe, expect, it } from "vitest";
import {
    bitsToValue,
    nextSeed,
    seedToUnitInterval,
    toggleBitValue,
    updateAt,
    valueToHex,
} from "../src/util";

describe("bitsToValue", () => {
    it("converts an all-zero row to 0", () => {
        expect(bitsToValue([0, 0, 0, 0, 0, 0, 0, 0])).toBe(0);
    });

    it("converts an all-one row to 255", () => {
        expect(bitsToValue([1, 1, 1, 1, 1, 1, 1, 1])).toBe(255);
    });

    it("treats index 0 as the most significant bit", () => {
        // 0b10000000 = 128
        expect(bitsToValue([1, 0, 0, 0, 0, 0, 0, 0])).toBe(128);
    });
});

describe("valueToHex", () => {
    it("pads single-digit hex values with a leading zero", () => {
        expect(valueToHex(10)).toBe("0A");
    });

    it("formats 255 as FF", () => {
        expect(valueToHex(255)).toBe("FF");
    });
});

describe("updateAt", () => {
    it("replaces only the targeted index", () => {
        expect(updateAt([1, 2, 3], 1, n => n * 10)).toEqual([1, 20, 3]);
    });

    it("does not mutate the original array", () => {
        const original = [1, 2, 3];
        updateAt(original, 0, n => n + 1);
        expect(original).toEqual([1, 2, 3]);
    });
});

describe("toggleBitValue", () => {
    it("flips 0 to 1", () => {
        expect(toggleBitValue(0)).toBe(1);
    });

    it("flips 1 to 0", () => {
        expect(toggleBitValue(1)).toBe(0);
    });
});

describe("nextSeed", () => {
    it("is deterministic - the same seed always yields the same next seed", () => {
        expect(nextSeed(42)).toBe(nextSeed(42));
    });

    it("produces a value different from the seed it was given", () => {
        expect(nextSeed(42)).not.toBe(42);
    });

    it("produces different seeds from different starting seeds", () => {
        expect(nextSeed(1)).not.toBe(nextSeed(2));
    });
});

describe("seedToUnitInterval", () => {
    it("maps every seed into the range [0, 1)", () => {
        const seeds = [0, 1, 42, 999983, 0x7fffffff];
        seeds.forEach(seed => {
            const scaled = seedToUnitInterval(nextSeed(seed));
            expect(scaled).toBeGreaterThanOrEqual(0);
            expect(scaled).toBeLessThan(1);
        });
    });
});
