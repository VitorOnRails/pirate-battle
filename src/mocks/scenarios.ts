import { clearConfirmed } from "./db";
import { clearPending } from "../data/pending";

export type Scenario =
  | "success"
  | "empty"
  | "slow"
  | "variable-latency"
  | "out-of-order"
  | "timeout"
  | "offline"
  | "http-400"
  | "http-500"
  | "reads-fail"
  | "submit-timeout"
  | "submit-fail";

export type Fault =
  | { kind: "ok" }
  | { kind: "connection" }
  | { kind: "timeout" }
  | { kind: "commit-timeout" }
  | { kind: "http"; status: number };

const OK: Fault = { kind: "ok" };

type LatencyProfile = "fast" | "slow" | "variable" | "reorder";

interface ScenarioSpec {
  id: Scenario;
  label: string;
  hint: string;
  latency: LatencyProfile;

  empty?: boolean;

  read: Fault;

  write: Fault;
}

export const TIMEOUT_HANG_MS = 9000;

const SPECS: ScenarioSpec[] = [
  { id: "success", label: "Success", hint: "Fast and reliable", latency: "fast", read: OK, write: OK },
  { id: "empty", label: "Empty lists", hint: "Reads return no data", latency: "fast", empty: true, read: OK, write: OK },
  { id: "slow", label: "Slow responses", hint: "High latency on every request", latency: "slow", read: OK, write: OK },
  { id: "variable-latency", label: "Variable latency", hint: "Latency swings request to request", latency: "variable", read: OK, write: OK },
  { id: "out-of-order", label: "Out-of-order replies", hint: "Slow replies can land after newer ones", latency: "reorder", read: OK, write: OK },
  { id: "timeout", label: "Request timeout", hint: "Requests hang past the client timeout", latency: "fast", read: { kind: "timeout" }, write: { kind: "timeout" } },
  { id: "offline", label: "Connection failure", hint: "Every request fails to connect", latency: "fast", read: { kind: "connection" }, write: { kind: "connection" } },
  { id: "http-400", label: "HTTP 400", hint: "Every request returns 400", latency: "fast", read: { kind: "http", status: 400 }, write: { kind: "http", status: 400 } },
  { id: "http-500", label: "HTTP 500", hint: "Every request returns 500", latency: "fast", read: { kind: "http", status: 500 }, write: { kind: "http", status: 500 } },
  { id: "reads-fail", label: "Reads unavailable", hint: "Ranking & history fail; saving still works", latency: "fast", read: { kind: "http", status: 503 }, write: OK },
  { id: "submit-timeout", label: "Commit then timeout", hint: "Save commits, reply times out (recovers, no dup)", latency: "fast", read: OK, write: { kind: "commit-timeout" } },
  { id: "submit-fail", label: "Save unavailable", hint: "Saving fails; the result stays pending", latency: "fast", read: OK, write: { kind: "http", status: 503 } },
];

export const SCENARIOS: { id: Scenario; label: string; hint: string }[] = SPECS.map(
  ({ id, label, hint }) => ({ id, label, hint }),
);

const STORAGE_KEY = "pirate-battle:scenario";
let current: Scenario = loadScenario();

function loadScenario(): Scenario {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as Scenario | null;
    if (v && SPECS.some((s) => s.id === v)) return v;
  } catch {}
  return "success";
}

function activeSpec(): ScenarioSpec {
  return SPECS.find((s) => s.id === current) ?? SPECS[0];
}

export function getScenario(): Scenario {
  return current;
}

export function setScenario(s: Scenario): void {
  current = s;
  try {
    localStorage.setItem(STORAGE_KEY, s);
  } catch {}
}

export function resetDemoData(): void {
  clearConfirmed();
  clearPending();
  setScenario("success");
}

let reorderTick = 0;

export function scenarioLatency(): number {
  switch (activeSpec().latency) {
    case "slow":
      return 900 + Math.random() * 1600;
    case "variable":
      return 150 + Math.random() * 2350;
    case "reorder": {
      const steps = 5;
      const delayMs = 1600 - (reorderTick % steps) * 350;
      reorderTick += 1;
      return Math.max(150, delayMs);
    }
    case "fast":
    default:
      return 120 + Math.random() * 180;
  }
}

export function readFault(): Fault {
  return activeSpec().read;
}

export function writeFault(): Fault {
  return activeSpec().write;
}

export function readsEmpty(): boolean {
  return activeSpec().empty === true;
}
