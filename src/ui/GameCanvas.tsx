import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { Game, type GameOverReason, type PauseReason } from "../engine/game";
import { config } from "../engine/config";
import { loadAssets } from "../engine/assets";
import type { MatchSettings } from "../engine/settings";
import type { InputAction } from "../engine/input";
import { getPlayer } from "../data/player";
import { addPending } from "../data/pending";
import { useSubmitMatch } from "../data/queries";
import type { MatchRecord } from "../data/contracts";
import "../styles/hud.css";

const UI = "/assets/png/default/ui";

interface GameCanvasProps {
  settings: MatchSettings;
  onExitToMenu: () => void;
}

export function GameCanvas({ settings, onExitToMenu }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);

  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(config.player.health);
  const [timeLeft, setTimeLeft] = useState(settings.sessionTime);
  const [overReason, setOverReason] = useState<GameOverReason | null>(null);
  const [paused, setPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<PauseReason>("manual");

  const [progress, setProgress] = useState(0);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [resultReady, setResultReady] = useState(false);

  const captain = getPlayer().name;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let game: Game | null = null;
    setLoadState("loading");
    setProgress(0);

    (async () => {
      try {
        await loadAssets((p) => {
          if (!cancelled) setProgress(p);
        });
      } catch {
        if (!cancelled) setLoadState("error");
        return;
      }
      if (cancelled) return;

      game = new Game(
        {
          onScoreChange: setScore,
          onHealthChange: setHealth,
          onTimeChange: setTimeLeft,
          onGameOver: setOverReason,
          onPauseChange: (p, reason) => {
            setPaused(p);
            if (p && reason) setPauseReason(reason);
          },
        },
        settings,
      );
      gameRef.current = game;
      setLoadState("ready");
      await game.init(container);
    })();

    return () => {
      cancelled = true;
      gameRef.current = null;
      game?.destroy();
    };
  }, [reloadKey, settings]);

  const submit = useSubmitMatch();
  const recordRef = useRef<MatchRecord | null>(null);

  useEffect(() => {
    if (!overReason) {
      recordRef.current = null;
      return;
    }
    if (recordRef.current) return;
    const me = getPlayer();
    const record: MatchRecord = {
      id: crypto.randomUUID(),
      playerId: me.id,
      playerName: me.name,
      score,
      durationSec: Math.max(0, settings.sessionTime - timeLeft),
      endReason: overReason,
      config: { sessionTime: settings.sessionTime, spawnInterval: settings.spawnInterval },
      date: new Date().toISOString(),
    };
    recordRef.current = record;
    addPending(record);
    submit.mutate(record);
  }, [overReason]);

  useEffect(() => {
    if (!overReason) {
      setResultReady(false);
      return;
    }
    const t = setTimeout(() => setResultReady(true), 1300);
    return () => clearTimeout(t);
  }, [overReason]);

  const playAgain = () => {
    setOverReason(null);
    gameRef.current?.reset();
  };

  const retrySubmit = () => {
    if (recordRef.current) submit.mutate(recordRef.current);
  };

  const canPause = loadState === "ready" && !overReason && !paused;
  const maxHealth = config.player.health;
  const shownHealth = Math.max(0, health);
  const healthPct = Math.max(0, (health / maxHealth) * 100);
  const healthColor = healthPct > 50 ? "green" : healthPct > 25 ? "amber" : "red";
  const survived = Math.max(0, settings.sessionTime - timeLeft);
  const showControls = loadState === "ready" && !overReason && !paused;
  const outcomeWord = overReason === "death" ? "Game Over!" : "Time's Up!";
  const pauseMessage: Record<PauseReason, string> = {
    manual: "You paused the battle.",
    key: "Paused from the keyboard.",
    blur: "Paused — the window lost focus.",
    hidden: "Paused — the tab was hidden.",
  };

  return (
    <div className="game-root">
      <div ref={containerRef} className="game-canvas" />

      {loadState === "loading" && (
        <div className="overlay overlay-fixed">
          <div className="overlay-panel">
            <h1>Loading…</h1>
            <div className="load-bar">
              <div className="load-bar-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <p>{Math.round(progress * 100)}%</p>
          </div>
        </div>
      )}

      {loadState === "error" && (
        <div className="overlay overlay-fixed">
          <div className="overlay-panel">
            <h1>Failed to load assets</h1>
            <p>Check your connection and try again.</p>
            <button type="button" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </button>
          </div>
        </div>
      )}

      {loadState === "ready" && (
        <div className="hud">
          <div className="hud-left">
            <div className="hud-health" role="group" aria-label="Hull integrity">
              <img className="hud-heart" src={`${UI}/hud/icon_heart.png`} alt="" />
              <div className="hud-bar">
                <img className="hud-bar-frame" src={`${UI}/hud/health_frame.png`} alt="" />
                <div className="hud-bar-track" style={{ width: `${healthPct}%` }}>
                  <img className="hud-bar-fill" src={`${UI}/hud/health_fill_${healthColor}.png`} alt="" />
                </div>
                <span className="hud-bar-text">
                  {shownHealth} / {maxHealth}
                </span>
              </div>
            </div>
            <div className="hud-captain">
              <span className="hud-captain-label">Captain</span>
              <span className="hud-captain-name">{captain}</span>
            </div>
          </div>

          <div className="hud-right">
            <div className="hud-counter" aria-live="polite">
              <span className="sr-only">Score</span>
              <img className="hud-counter-icon" src={`${UI}/hud/icon_score.png`} alt="" />
              <span className="hud-counter-text">{score}</span>
            </div>
            <div className="hud-counter">
              <span className="sr-only">Time left</span>
              <img className="hud-counter-icon" src={`${UI}/hud/icon_time.png`} alt="" />
              <span className="hud-counter-text">{formatTime(timeLeft)}</span>
            </div>
            <button
              type="button"
              className="round-btn hud-pause"
              onClick={() => gameRef.current?.pause("manual")}
              disabled={!canPause}
              aria-label="Pause"
            >
              <img src={`${UI}/controls/icon_pause.png`} alt="" />
            </button>
          </div>
        </div>
      )}

      {showControls && (
        <div className="touch-controls" aria-label="Touch controls">
          <div className="touch-cluster touch-fire">
            <HoldButton gameRef={gameRef} action="fireLeft" icon="icon_fire_left" label="Fire left broadside" />
            <HoldButton gameRef={gameRef} action="fireFront" icon="icon_fire_front" label="Fire forward" />
            <HoldButton gameRef={gameRef} action="fireRight" icon="icon_fire_right" label="Fire right broadside" />
          </div>
          <div className="touch-cluster touch-move">
            <HoldButton gameRef={gameRef} action="rotateLeft" icon="icon_turn_left" label="Turn left" />
            <HoldButton gameRef={gameRef} action="forward" icon="icon_forward" label="Sail forward" />
            <HoldButton gameRef={gameRef} action="rotateRight" icon="icon_turn_right" label="Turn right" />
          </div>
        </div>
      )}

      {paused && !overReason && (
        <div className="overlay">
          <div className="panel overlay-card">
            <h1 className="overlay-card-title">Paused</h1>
            <p>{pauseMessage[pauseReason]}</p>
            <div className="overlay-actions">
              <button type="button" className="btn" onClick={onExitToMenu}>
                Main Menu
              </button>
              <button type="button" className="btn btn-primary" onClick={() => gameRef.current?.resume()}>
                Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {overReason && !resultReady && (
        <div className="death-flash">
          <span>{outcomeWord}</span>
        </div>
      )}

      {overReason && resultReady && (
        <div className="overlay">
          <div className="panel overlay-card result-card">
            <h1 className="overlay-card-title">{outcomeWord}</h1>
            <p className="result-captain">{captain}</p>
            <p className="result-score">{score}</p>
            <p className="result-label">Points earned</p>
            <p className="result-meta">
              Time played: {formatTime(survived)}
              <br />
              {overReason === "death" ? "Your ship was sunk." : "You outlasted the clock."}
            </p>
            <p className="record-status">
              {submit.isPending && "Saving your score…"}
              {submit.isSuccess && "Score saved to the ranking."}
              {submit.isError && "Couldn't save — it will retry automatically."}
            </p>
            {submit.isError && (
              <button type="button" className="btn-mini result-retry" onClick={retrySubmit}>
                Retry save
              </button>
            )}
            <div className="overlay-actions">
              <button type="button" className="btn" onClick={onExitToMenu}>
                Main Menu
              </button>
              <button type="button" className="btn btn-primary" onClick={playAgain}>
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(secondsLeft: number): string {
  const s = Math.max(0, Math.ceil(secondsLeft));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

interface HoldButtonProps {
  gameRef: MutableRefObject<Game | null>;
  action: InputAction;
  icon: string;
  label: string;
}

function HoldButton({ gameRef, action, icon, label }: HoldButtonProps) {
  const set = (active: boolean) => gameRef.current?.setInput(action, active);
  return (
    <button
      type="button"
      className="round-btn touch-btn"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => set(false)}
    >
      <img src={`${UI}/controls/${icon}.png`} alt="" draggable={false} />
    </button>
  );
}
