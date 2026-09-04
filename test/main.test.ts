import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { Observable } from "rxjs";
import { State } from "../src/types";
import { state$ } from "../src/main";

describe("state$", () => {
    it("is defined", () => {
        assert.isDefined(state$);
    });
    it("is a function", () => {
        assert.isFunction(state$);
    });

    it("returns an Observable", () => {
        assert.instanceOf(state$(), Observable);
    });

    it("returns a fresh Observable on every call", () => {
        // Each call must produce an independent stream, since
        // main.ts relies on this for switchMap(() => state$()) to
        // actually tear down and restart the game on "r".
        assert.notStrictEqual(state$(), state$());
    });
});
