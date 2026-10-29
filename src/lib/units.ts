// Everything is stored in kg; this only changes what people see and type.
export type Unit = "kg" | "lb";

const KEY = "ironward.unit";
const LB = 2.2046226;

let current: Unit = (() => {
  try {
    return localStorage.getItem(KEY) === "lb" ? "lb" : "kg";
  } catch {
    return "kg";
  }
})();

export function getUnit(): Unit {
  return current;
}

export function setUnit(u: Unit) {
  current = u;
  try {
    localStorage.setItem(KEY, u);
  } catch {
    // Still applies for this visit.
  }
}

// kg -> what's shown (lb rounded to the nearest half pound).
export function toUnit(kg: number): number {
  return current === "lb" ? Math.round(kg * LB * 2) / 2 : Math.round(kg * 100) / 100;
}

// What was typed -> kg.
export function fromUnit(v: number): number {
  return current === "lb" ? Math.round((v / LB) * 1000) / 1000 : v;
}

export function fmtWeight(kg: number): string {
  return `${toUnit(kg)} ${current}`;
}
