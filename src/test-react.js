// Fake react execution model to see if anything gets dropped
let hooks = [];
let currentIndex = 0;
let renderQueue = [];

function useState(initial) {
  const index = currentIndex++;
  if (hooks[index] === undefined) hooks[index] = initial;
  const state = hooks[index];
  const setState = (updater) => {
    const next = typeof updater === 'function' ? updater(hooks[index]) : updater;
    if (next !== hooks[index]) {
      hooks[index] = next;
      renderQueue.push(true);
    }
  };
  return [state, setState];
}

let effects = [];
let effectIndex = 0;
function useEffect(cb, deps) {
  const index = effectIndex++;
  const prevDeps = effects[index]?.deps;
  let changed = !prevDeps;
  if (!changed) {
    for (let i = 0; i < deps.length; i++) {
        if (deps[i] !== prevDeps[i]) { changed = true; break; }
    }
  }
  if (changed) {
    effects[index] = { cb, deps };
  }
}

let isRendering = false;
let globalRenderState = null;

function renderComponent() {
  currentIndex = 0;
  effectIndex = 0;
  
  const [state, setState] = useState({
    measureIndex: 0,
    eventIndex: 0,
    pressedNotes: new Set()
  });
  
  globalRenderState = state;
  
  const expectedPitches = state.eventIndex === 0 ? [64] : [65]; // simplifies for demo
  const currentEvent = "event"; // dummy
  
  useEffect(() => {
    if (!currentEvent) return;
    const required = new Set(expectedPitches);
    let allPressed = true;
    for (let p of required) {
      if (!state.pressedNotes.has(p)) { allPressed = false; break; }
    }
    
    if (allPressed) {
      setState(prev => {
        let n = prev.eventIndex + 1;
        return { ...prev, eventIndex: n };
      });
    }
  }, [state.pressedNotes, expectedPitches, state.eventIndex]);
  
  return {
    state, 
    handleNoteOn: (pitch) => {
      setState(prev => {
        const next = new Set(prev.pressedNotes);
        next.add(pitch);
        return { ...prev, pressedNotes: next };
      });
    }
  };
}

function flush() {
  while(renderQueue.length > 0) {
    renderQueue.pop();
    const inst = renderComponent();
    // run ALL registered effects that were marked changed
    for (let i=0; i<effects.length; i++) {
      if (effects[i]) {
        effects[i].cb();
        effects[i] = { cb: effects[i].cb, deps: effects[i].deps, executed: true }; // prevent double exec in this naive model unless changed
      }
    }
  }
}

const UI = renderComponent();
flush();
console.log("Initial state:", globalRenderState.eventIndex);

UI.handleNoteOn(64);
renderQueue.push(true); // simulate DOM event trigger
flush();
console.log("After press 64:", globalRenderState.eventIndex);

