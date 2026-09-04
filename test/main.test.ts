import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { Observable } from "rxjs";
import { State } from "../src/types";
import { state$ } from "../src/main";

describe("state$ - game loop progression", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("advances elapsedTicks as time passes", () => {
        let latest: State | undefined;
        const sub = state$().subscribe(s => {
            latest = s;
        });

        vi.advanceTimersByTime(500); // 500ms / 50ms per tick = 10 ticks

        assert.isDefined(latest);
        assert.isAbove(latest!.elapsedTicks, 0);
        sub.unsubscribe();
    });
});
