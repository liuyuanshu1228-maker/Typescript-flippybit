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
});
