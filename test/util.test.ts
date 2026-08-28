import { describe, expect, it } from "vitest";
import { bitsToValue, updateAt, valueToHex } from "../src/util";

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
