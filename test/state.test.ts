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

describe("tick - score", () => {
    it("increments score by 1 when a target is matched", () => {
        const withOneTarget = spawnTarget(0)(initialState);
        const almostThere: State = {
            ...withOneTarget,
            targets: [{ ...withOneTarget.targets[0], y: 400 }],
        };
        expect(tick(almostThere).score).toBe(1);
    });

    it("does not change score when a target is missed", () => {
        const withOneTarget = spawnTarget(0)(initialState);
        const mismatched: State = {
            ...withOneTarget,
            targets: [{ ...withOneTarget.targets[0], value: 255, y: 400 }],
        };
        expect(tick(mismatched).score).toBe(0);
    });
});

describe("tick - speeding up", () => {
    it("increases the effective fall speed as elapsedTicks grows", () => {
        const withOneTarget = spawnTarget(0)(initialState);
        const early: State = { ...withOneTarget, elapsedTicks: 0 };
        const late: State = { ...withOneTarget, elapsedTicks: 5000 };
        const earlyDelta = tick(early).targets[0].y - early.targets[0].y;
        const lateDelta = tick(late).targets[0].y - late.targets[0].y;
        expect(lateDelta).toBeGreaterThan(earlyDelta);
    });
});

/**new feature added test for the first two*/
describe("togglePause", () => {
    it("pauses an unpaused state", () => {
        expect(togglePause(initialState).paused).toBe(true);
    });

    it("unpauses a paused state", () => {
        const paused = togglePause(initialState);
        expect(togglePause(paused).paused).toBe(false);
    });
});

/**new feature added test for dropping*/
describe("tick - paused", () => {
    it("leaves state unchanged while paused", () => {
        const paused: State = { ...spawnTarget(0)(initialState), paused: true };
        expect(tick(paused)).toBe(paused);
    });
});
/**To prevent unreasonable behavior such as
 * "secretly generating targets during pauses and then
 * suddenly appearing as soon as the game resumes".*/
describe("spawnTarget - paused", () => {
    it("does not add a target while paused", () => {
        const paused: State = { ...initialState, paused: true };
        expect(spawnTarget(5)(paused).targets).toHaveLength(0);
    });
});
