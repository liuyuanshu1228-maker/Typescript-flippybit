# Flippy Bit

## Running

```
npm install
npm run dev
```

Open the printed `localhost` URL. To run the test suite:

```
npm run test:run
```

## Controls

| Key / Input | Action |
|---|---|
| `1`–`8` | Flip the corresponding bit |
| Click a digit box | Flip the same bit |
| `P` | Pause / unpause |
| `R` | Restart (works mid-game or after game over) |

## Architecture

| File | Responsibility |
|---|---|
| `types.ts` | Shared types and constants (`State`, `FallingTarget`, `Action`) |
| `util.ts` | Small pure helpers (`bitsToValue`, `valueToHex`, `updateAt`) |
| `state.ts` | Game logic — every state transition, plus `reduceState` |
| `observable.ts` | Turns keyboard/mouse/timer events into `Action` values |
| `view.ts` | Renders `State` to the SVG canvas |
| `main.ts` | Wires the streams together and subscribes |

The whole game runs off a single pipeline in `main.ts`:

```ts
merge(tick$, allKeyFlips$, mouseFlip$, spawn$, pauseToggle$).pipe(
    scan(reduceState, initialState),
)
```

Every input source (`tick$`, key/mouse flips, target spawns, pause
toggles) produces `Action` values — functions of type
`(s: State) => State`. `merge` combines them into one stream, and
`scan(reduceState, initialState)` folds each `Action` into the
running state, one at a time, in the order it arrives.

### Restart

Restart is deliberately not an `Action` inside that pipeline.
`reduceState` stops applying any action once `gameEnd` is `true`, so
the pipeline has no way to reset its own state from within.

Instead, `main.ts` treats the whole pipeline as disposable:

```ts
merge(firstClick$, restartKey$)
    .pipe(switchMap(() => state$()))
    .subscribe(render());
```

`firstClick$` (the very first `mousedown` on the page, taken once)
starts the game; `restartKey$` (the `r`/`R` key) restarts it at any
point. Both feed the same `switchMap`, so starting and restarting are
the same operation as far as the pipeline is concerned.

`switchMap` cancels the current `state$()` run before starting a new
one — that's what resets the game, since it stops `tick$`/`spawn$`
and lets the new run `scan` again from `initialState`. `mergeMap`
would leave the old run alive alongside the new one instead.

## Advanced Features

### Pause (`P`)

`paused` is a boolean on `State`, toggled by `togglePause`. No
Observable is stopped or unsubscribed when the game pauses —
`tick$` and `spawn$` keep emitting the entire time. What changes is
that `tick` and `spawnTarget` check `s.paused` first and return the
state unchanged when it's `true`.

Fall speed is derived from `elapsedTicks`, not wall-clock time. This
is what makes pause work with no extra state: freezing the single
`elapsedTicks` counter freezes fall speed, the check-line judgement,
and the difficulty ramp all at once, since all three are pure
functions of that one number.

If a `spawn$` timer fires while the game is paused, the resulting
target is dropped rather than added to state. Without this, a
target would be silently queued during the pause and appear the
instant the game resumes, which the player would have no way to
react to — effectively an unfair, unavoidable hit.

### Test suite

- `util.test.ts` — the pure helpers in isolation (`bitsToValue`,
  `valueToHex`, `updateAt`, including that `updateAt` doesn't mutate
  its input).
- `state.test.ts` — every `Action` and `reduceState`, tested against
  plain `State` objects with no Observables involved: flipping,
  spawning (unique ids, no-op while paused), ticking (movement,
  matching/missing at the check line, speeding up over time, no-op
  while paused), pausing/unpausing, and the multi-target rule (only
  the lowest unresolved target is ever judged).
- `main.test.ts` — the actual `state$` pipeline, using
  `vi.useFakeTimers()` to confirm `tick$` drives `elapsedTicks`
  forward through the real `scan(reduceState, …)` call, not just the
  reducer in isolation.

`state.test.ts` was written before `observable.ts` existed. It was
used to define what each `Action` should do — including edge cases
like pause behaviour — before the streams that call them were built.

## Functional Programming Notes

- No `if`/`else` anywhere in the codebase — branching is done with
  ternaries, `&&`, and `??`.
- No `let`/`var` — every binding is `const`, and every state update
  produces a new object (`{ ...s, changedField }` or `updateAt`)
  rather than mutating in place.
- Pure and impure logic are never combined inside the same function
  body. `observable.ts` keeps DOM-reading functions (`keyDownFor`,
  `digitIndexClicks$`) and pure conversion functions (`toFlipAction`,
  `toSpawnAction`) as separate named functions; they're composed via
  `.pipe(map(...))` rather than one function doing both.
- Generics are used where the logic doesn't depend on a specific
  type: `updateAt<T>` in `util.ts` works on any array, and
  `fromDocument<T>` in `observable.ts` guards any DOM-derived stream
  the same way, regardless of what it emits.
- `flipBit` and `spawnTarget` are curried (`(index) => (s) => State`
  and `(value) => (s) => State`) so that partially applying them —
  e.g. `flipBit(3)` — produces a value of type `Action`, letting them
  slot directly into the same `Action` pipeline as `tick` and
  `togglePause` without any wrapping.

## Design Decision: the DOM Element Cache

`view.ts` keeps a `Map<number, TargetElements>` to reuse existing
SVG nodes for a target id instead of recreating them every frame.
This map is mutated directly (`.set`/`.delete`) — it's the one
mutable data structure in the codebase.

This is intentional and contained: the map lives entirely inside the
closure returned by `render()`, in the rendering layer whose job is
already to push state out to the DOM. `state.ts` has no reference to
it and no way to read or write it — game state stays fully immutable
regardless of whatever bookkeeping the rendering layer needs to do
to avoid recreating DOM nodes on every tick.
