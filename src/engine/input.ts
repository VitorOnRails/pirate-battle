export type InputAction =
  | "forward"
  | "rotateLeft"
  | "rotateRight"
  | "fireFront"
  | "fireLeft"
  | "fireRight";

const KEY_MAP: Record<string, InputAction> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyA: "rotateLeft",
  ArrowLeft: "rotateLeft",
  KeyD: "rotateRight",
  ArrowRight: "rotateRight",
  Space: "fireFront",
  KeyQ: "fireLeft",
  KeyE: "fireRight",
};

export class Input {
  private active = new Set<InputAction>();

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  isActive(action: InputAction): boolean {
    return this.active.has(action);
  }

  setAction(action: InputAction, active: boolean): void {
    if (active) this.active.add(action);
    else this.active.delete(action);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const action = KEY_MAP[e.code];
    if (action) {
      e.preventDefault();
      this.active.add(action);
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const action = KEY_MAP[e.code];
    if (action) this.active.delete(action);
  };

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.active.clear();
  }
}
