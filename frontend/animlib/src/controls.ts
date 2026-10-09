import type { ControlDefinition, ControlValue } from "./types.js";

type Input = HTMLInputElement | HTMLSelectElement;
interface Widget {
  input: Input;
  output: HTMLOutputElement;
  label: HTMLSpanElement;
  schema: string;
  kind: ControlDefinition["kind"];
  value: ControlValue;
  generation: number;
  pending: boolean;
}

/** Reconciles native widgets, retaining focus during playback and value changes. */
export class ControlOverlay {
  private readonly container: HTMLDivElement;
  private widgets = new Map<string, Widget>();
  private scene = "";

  constructor(
    root: HTMLElement,
    private readonly onChange: (id: string, value: ControlValue) => Promise<void> | void,
  ) {
    this.container = root.ownerDocument.createElement("div");
    this.container.className = "animlib-controls";
    this.container.setAttribute("aria-label", "Scene controls");
    root.append(this.container);
  }

  update(scene: string, controls: ControlDefinition[]): void {
    if (scene !== this.scene) {
      this.scene = scene;
      this.widgets.clear();
      this.container.replaceChildren();
    }
    const ids = new Set(controls.map(control => control.id));
    for (const [id, widget] of this.widgets) {
      if (!ids.has(id)) {
        widget.input.closest("label")?.remove();
        this.widgets.delete(id);
      }
    }
    for (const control of controls) {
      const schema = JSON.stringify([control.kind, control.min, control.max, control.step, control.options]);
      let widget = this.widgets.get(control.id);
      if (widget && widget.schema !== schema) {
        widget.input.closest("label")?.remove();
        this.widgets.delete(control.id);
        widget = undefined;
      }
      if (!widget) {
        const document = this.container.ownerDocument;
        const label = document.createElement("label");
        label.className = "animlib-control";
        const caption = document.createElement("span");
        const output = document.createElement("output");
        const input = control.kind === "select" ? document.createElement("select") : document.createElement("input");
        input.dataset.controlId = control.id;
        if (input.tagName === "INPUT") {
          const field = input as HTMLInputElement;
          field.type = control.kind === "slider" ? "range" : "checkbox";
          if (control.kind === "slider") {
            field.min = String(control.min);
            field.max = String(control.max);
            field.step = String(control.step ?? "any");
          }
        } else {
          for (const value of control.options ?? []) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            input.append(option);
          }
        }
        const created: Widget = {
          input, output, label: caption, schema, kind: control.kind,
          value: control.value, generation: 0, pending: false,
        };
        const event = control.kind === "slider" ? "input" : "change";
        input.addEventListener(event, () => {
          const value = control.kind === "slider" ? Number(input.value)
            : control.kind === "toggle" ? (input as HTMLInputElement).checked : input.value;
          const generation = ++created.generation;
          created.pending = true;
          output.textContent = control.kind === "toggle" ? "" : String(value);
          const settle = () => {
            if (generation !== created.generation) return;
            created.pending = false;
            this.applyValue(created);
          };
          try { void Promise.resolve(this.onChange(control.id, value)).then(settle, settle); }
          catch { settle(); }
        });
        label.append(caption, input, output);
        this.container.append(label);
        widget = created;
        this.widgets.set(control.id, widget);
      }
      widget.label.textContent = control.label;
      widget.value = control.value;
      if (!widget.pending) this.applyValue(widget);
    }
  }

  private applyValue(widget: Widget): void {
    if (widget.kind === "toggle") (widget.input as HTMLInputElement).checked = Boolean(widget.value);
    else widget.input.value = String(widget.value);
    widget.output.textContent = widget.kind === "toggle" ? "" : String(widget.value);
  }

  dispose(): void {
    this.widgets.clear();
    this.container.remove();
  }
}
