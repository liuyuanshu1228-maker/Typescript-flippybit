import { describe, expect, it } from "vitest";
import {
    flipBit,
    initialState,
    reduceState,
    spawnTarget,
    tick,
} from "../src/state";
import { State } from "../src/types";

describe("flipBit", () => {
    it("flips a 0 bit to 1", () => {
        expect(flipBit(0)(initialState).bits[0]).toBe(1);
    });

    it("flips a 1 bit back to 0", () => {
        const once = flipBit(3)(initialState);
        expect(flipBit(3)(once).bits[3]).toBe(0);
    });

    it("only changes the targeted index", () => {
        expect(flipBit(2)(initialState).bits).toEqual([0, 0, 1, 0, 0, 0, 0, 0]);
    });
});

describe("spawnTarget", () => {
    it("adds a target at the top of the board", () => {
        const result = spawnTarget(0x1a)(initialState);
        expect(result.targets).toHaveLength(1);
        expect(result.targets[0]).toMatchObject({ value: 0x1a, y: 0 });
    });

    it("gives each spawned target a unique id", () => {
        const afterFirst = spawnTarget(1)(initialState);
        const afterSecond = spawnTarget(2)(afterFirst);
        const [first, second] = afterSecond.targets;
        expect(first.id).not.toBe(second.id);
    });
});

describe("tick", () => {
    const withOneTarget: State = spawnTarget(0)(initialState);

    it("moves targets downward", () => {
        const result = tick(withOneTarget);
        expect(result.targets[0].y).toBeGreaterThan(withOneTarget.targets[0].y);
    });

    it("does not end the game while the target is still falling", () => {
        expect(tick(withOneTarget).gameEnd).toBe(false);
    });

    it("resolves a target matched at the check line", () => {
        // bits are all 0, so a target with value 0 should match.
        const almostThere: State = {
            ...withOneTarget,
            targets: [{ ...withOneTarget.targets[0], y: 400 }],
        };
        const result = tick(almostThere);
        expect(result.targets).toHaveLength(0);
        expect(result.gameEnd).toBe(false);
    });

    it("ends the game when a mismatched target reaches the check line", () => {
        const mismatched: State = {
            ...withOneTarget,
            targets: [{ ...withOneTarget.targets[0], value: 255, y: 400 }],
        };
        expect(tick(mismatched).gameEnd).toBe(true);
    });
});

describe("reduceState", () => {
    it("ignores further actions once the game has ended", () => {
        const ended: State = { ...initialState, gameEnd: true };
        expect(reduceState(ended, flipBit(0))).toBe(ended);
    });

    it("applies the action while the game is still running", () => {
        expect(reduceState(initialState, flipBit(0)).bits[0]).toBe(1);
    });
});
