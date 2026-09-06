# Flippy Bit

## Controls

- `1`–`8` to flip a bit, or just click it
- `P` pauses
- `R` restarts, anytime

## How it's built

Six files, each doing one thing: `types.ts` = types, `util.ts` =
small helpers, `state.ts` = the actual game logic, `observable.ts` =
turns keyboard/mouse/timer stuff into actions, `view.ts` = draws it,
`main.ts` = glues it together. One pipeline runs the whole game:

```ts
merge(tick$, allKeyFlips$, mouseFlip$, spawn$, pauseToggle$).pipe(
    scan(reduceState, initialState),
)
```

Restart isn't part of that pipeline — once `gameEnd` is true,
`reduceState` just stops doing anything, it can't reset itself. So
`main.ts` kills the whole thing with `switchMap` and starts a new one.

## The two HD extras

**Pause.** Just a boolean on state. Nothing gets unsubscribed —
`tick$` and `spawn$` keep firing the whole time you're paused, but
`tick`/`spawnTarget` see `paused` is true and just hand back the
state unchanged. Fall speed is based on `elapsedTicks` not real
time, so freezing that one number freezes everything. If a spawn
timer goes off mid-pause, that target just gets dropped so nothing
appears the second you unpause.

**Tests.** `npm test` to run them. `util.test.ts` and `state.test.ts`
test everything in isolation — flipping, spawning, ticking, pausing.
`main.test.ts` runs the real pipeline with fake timers to make sure
`tick$` actually moves things through `scan`. Honestly wrote most of
`state.test.ts` before `observable.ts` even existed, it's how I
figured out what each action should do.

## Random note on a bug I hit

The streams that touch `document` (keyboard/mouse ones) needed a
`fromDocument` wrapper — `defer()` alone wasn't enough to stop them
crashing under Vitest (no DOM there), since the tests actually
subscribe. Had to fall back to `EMPTY` when there's no `document`.

## Other stuff

- No `if`/`else` anywhere, just ternaries and `&&`/`??`
- Nothing ever gets mutated, every update is a new object
- Mouse clicks work via event delegation on `#svgCanvas`

## Limitations

- No power-ups or other bases, just pause + tests for the HD bits
- No multiplayer, no difficulty selection
