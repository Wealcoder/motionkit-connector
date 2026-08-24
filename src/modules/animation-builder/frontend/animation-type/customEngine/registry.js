// Active animation handles keyed by editor animation id.
// Shape: { contexts: GSAPContext[], listeners: (()=>void)[] }
const active = new Map();

export function getActive(id) {
  return active.get(id);
}

export function setActive(id, handle) {
  active.set(id, handle);
}

export function deleteActive(id) {
  active.delete(id);
}

export function allActiveIds() {
  return [...active.keys()];
}

export function clearActive() {
  active.clear();
}

// Step-method registry. Handler signature: (timeline, step, vars) => void
const methods = new Map();

export function registerMethod(name, fn) {
  methods.set(name, fn);
}

export function getMethod(name) {
  return methods.get(name);
}

export function hasMethod(name) {
  return methods.has(name);
}
