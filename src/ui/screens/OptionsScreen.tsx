import { useState } from "react";
import {
  SETTINGS_BOUNDS,
  clampSettings,
  type MatchSettings,
} from "../../engine/settings";
import {
  SCENARIOS,
  getScenario,
  setScenario,
  resetDemoData,
  type Scenario,
} from "../../mocks/scenarios";
import { queryClient } from "../../data/queries";
import { getAudioSettings, setMuted, setVolume } from "../../audio/sounds";

interface OptionsScreenProps {
  settings: MatchSettings;
  onSave: (next: MatchSettings) => void;
  onCancel: () => void;
}

export function OptionsScreen({ settings, onSave, onCancel }: OptionsScreenProps) {
  const [sessionTime, setSessionTime] = useState(String(settings.sessionTime));
  const [spawnInterval, setSpawnInterval] = useState(String(settings.spawnInterval));
  const [scenario, setScenarioState] = useState<Scenario>(getScenario());
  const [audio, setAudio] = useState(getAudioSettings());

  const sessionErr = validate(sessionTime, SETTINGS_BOUNDS.sessionTime);
  const spawnErr = validate(spawnInterval, SETTINGS_BOUNDS.spawnInterval);
  const valid = !sessionErr && !spawnErr;

  const save = () => {
    if (!valid) return;
    onSave(
      clampSettings({
        sessionTime: Number(sessionTime),
        spawnInterval: Number(spawnInterval),
      }),
    );
  };

  return (
    <div className="screen">
      <div className="panel options-panel">
        <h1 className="screen-title">Battle Options</h1>
        <p className="screen-subtitle">Changes apply to your next match.</p>

        <Field
          label="Game session time"
          suffix="s"
          hint={`${SETTINGS_BOUNDS.sessionTime.min}–${SETTINGS_BOUNDS.sessionTime.max} seconds of active play`}
          value={sessionTime}
          onChange={setSessionTime}
          bounds={SETTINGS_BOUNDS.sessionTime}
          error={sessionErr}
        />
        <Field
          label="Enemy spawn time"
          suffix="s"
          hint={`${SETTINGS_BOUNDS.spawnInterval.min}–${SETTINGS_BOUNDS.spawnInterval.max} seconds between enemy ships`}
          value={spawnInterval}
          onChange={setSpawnInterval}
          bounds={SETTINGS_BOUNDS.spawnInterval}
          error={spawnErr}
        />

        <div className="field">
          <span className="field-label">Audio</span>
          <label className="audio-row">
            <input
              type="checkbox"
              checked={!audio.muted}
              onChange={(e) => {
                const muted = !e.target.checked;
                setMuted(muted);
                setAudio({ ...audio, muted });
              }}
            />
            <span>Sound effects &amp; ambience</span>
          </label>
          <label className="audio-row">
            <span className="audio-vol-label">Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(audio.volume * 100)}
              disabled={audio.muted}
              onChange={(e) => {
                const volume = Number(e.target.value) / 100;
                setVolume(volume);
                setAudio({ ...audio, volume });
              }}
            />
          </label>
        </div>

        <label className="field">
          <span className="field-label">Demo network</span>
          <select
            className="field-select"
            value={scenario}
            onChange={(e) => {
              const s = e.target.value as Scenario;
              setScenarioState(s);
              setScenario(s);
            }}
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} — {s.hint}
              </option>
            ))}
          </select>
          <span className="field-hint">
            Simulate network conditions for the ranking &amp; history API. Switch back
            to <b>Success</b> to flush any pending saves. Other captains are local
            demo fixtures.
          </span>
        </label>

        <button
          type="button"
          className="btn btn-small reset-demo"
          onClick={() => {
            resetDemoData();
            setScenarioState("success");
            void queryClient.invalidateQueries();
          }}
        >
          Reset demo data
        </button>

        <div className="screen-actions">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={!valid}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function validate(raw: string, b: { min: number; max: number }): string | null {
  const n = Number(raw);
  if (raw.trim() === "" || !Number.isFinite(n)) return "Enter a number";
  if (n < b.min || n > b.max) return `Must be between ${b.min} and ${b.max}`;
  return null;
}

interface FieldProps {
  label: string;
  suffix: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  bounds: { min: number; max: number };
  error: string | null;
}

function Field({ label, suffix, hint, value, onChange, bounds, error }: FieldProps) {
  const step = (delta: number) => {
    const n = Number(value);
    const base = Number.isFinite(n) ? n : bounds.min;
    onChange(String(Math.min(bounds.max, Math.max(bounds.min, base + delta))));
  };
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className="field-row">
        <button type="button" className="stepper" onClick={() => step(-1)} aria-label={`Decrease ${label}`}>
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={bounds.min}
          max={bounds.max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
        <span className="field-suffix">{suffix}</span>
        <button type="button" className="stepper" onClick={() => step(1)} aria-label={`Increase ${label}`}>
          +
        </button>
      </div>
      <span className={error ? "field-error" : "field-hint"}>{error ?? hint}</span>
    </label>
  );
}
