const assert = require('assert');

// Simulate state
let state = {
  measureIndex: 0,
  eventIndex: 0,
  pressedNotes: new Set()
};

const song = {
  measures: [
    { events: [ { pitches: [64] }, { pitches: [64] }, { pitches: [65] } ] }
  ]
};

function setState(updater) {
  const nextState = updater(state);
  console.log("State updated from", state.eventIndex, "to", nextState.eventIndex);
  state = nextState;
}

// simulate allPressed
let prev = state;
let nextEv = prev.eventIndex + 1;
let nextMs = prev.measureIndex;

const meas = song.measures[nextMs];

if (nextEv >= meas.events.length) {
  nextEv = 0;
  nextMs++;
}

console.log("Simulating advance:", nextMs, nextEv);
setState((prev) => {
    return { ...prev, measureIndex: nextMs, eventIndex: nextEv };
});
