import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { lastValueFrom, take } from "rxjs";
import { state$ } from "../src/main";

describe("state$ - game loop progression", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("advances elapsedTicks as time passes", async () => {
        const latestPromise = lastValueFrom(state$().pipe(take(10)));

        vi.advanceTimersByTime(500); // 500ms / 50ms per tick = 10 ticks

        const latest = await latestPromise;
        assert.isAbove(latest.elapsedTicks, 0);
    });

    /**
     * spawn$ fires after a random 1-3s delay. The DOM-driven
     * streams merged alongside it (allKeyFlips$, mouseFlip$ and
     * pauseToggle$) collapse to EMPTY under this Node runner via
     * fromDocument, so subscribing to state$() here is safe and
     * only the timer-driven sources actually emit.
     */
    it("adds at least one target once spawn$ has fired", async () => {
        const latestPromise = lastValueFrom(state$().pipe(take(80)));

        // 80 ticks x 50ms = 4000ms, comfortably past spawn$'s
        // 1000-3000ms first-delay window.
        vi.advanceTimersByTime(4000);

        const latest = await latestPromise;
        assert.isAbove(latest.nextTargetId, 0);
    });
});
