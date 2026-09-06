/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */

import "./style.css";

import {
    Observable,
    filter,
    fromEvent,
    merge,
    scan,
    switchMap,
    take,
} from "rxjs";

import {
    allKeyFlips$,
    mouseFlip$,
    pauseToggle$,
    spawn$,
    tick$,
} from "./observable";
import { initialState, reduceState } from "./state";
import { State } from "./types";
import { render } from "./view";

export const state$ = (): Observable<State> =>
    merge(tick$, allKeyFlips$, mouseFlip$, spawn$, pauseToggle$).pipe(
        scan(reduceState, initialState),
    );

/**
 * Wires up the two "outer" streams that sit above state$ itself - the
 * very first mousedown (which starts the game) and the "r" key
 * (which restarts it) - then subscribes to render the resulting
 * state. Pulled into its own named function, rather than inlined,
 * so it can be invoked with `&&` below instead of an `if` statement,
 * and so importing this module in a Node test environment (no
 * `window`) never tries to touch the DOM.
 */
const startGame = (): void => {
    // take(1): must fire only once, otherwise every later in-game
    // click (e.g. on a digit box) would also restart the whole game.
    const firstClick$ = fromEvent(document.body, "mousedown").pipe(take(1));
    const restartKey$ = fromEvent<KeyboardEvent>(document, "keydown").pipe(
        filter(e => e.key === "r" || e.key === "R"),
    );

    // switchMap tears down the current state$() subscription
    // (stopping its tick$/spawn$ timers) and subscribes to a brand
    // new one, scanned again from initialState, every time either
    // outer stream fires.
    merge(firstClick$, restartKey$)
        .pipe(switchMap(() => state$()))
        .subscribe(render());
};

// Only run the browser-facing setup when a `window` actually exists
// (skips this in the Vitest/Node environment that runs main.test.ts).
typeof window !== "undefined" && startGame();
