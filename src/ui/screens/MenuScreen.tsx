import { useState } from "react";
import { getPlayer, setPlayerName, makeGuestName } from "../../data/player";

interface MenuScreenProps {
  onPlay: () => void;
  onOptions: () => void;
  onRanking: () => void;
  onHistory: () => void;
}

const NAME_MIN = 2;
const NAME_MAX = 24;

export function MenuScreen({ onPlay, onOptions, onRanking, onHistory }: MenuScreenProps) {
  const [name, setName] = useState(getPlayer().name);
  const [showHelp, setShowHelp] = useState(false);

  const trimmed = name.trim();
  const nameInvalid = trimmed.length === 1 || trimmed.length > NAME_MAX;

  const play = () => {
    if (nameInvalid) return;
    setPlayerName(trimmed.length === 0 ? makeGuestName() : trimmed);
    onPlay();
  };

  const playAsGuest = () => {
    const guest = makeGuestName();
    setPlayerName(guest);
    setName(guest);
    onPlay();
  };

  return (
    <div className="screen">
      <div className="panel menu-panel">
        <img
          className="menu-title"
          src="/assets/png/default/ui/menu/title_pirate_battle.png"
          alt="Pirate Battle"
        />
        <p className="menu-subtitle">Set sail. Take command.</p>

        <label className="field menu-name">
          <span className="field-label">
            Captain name <span className="field-optional">(optional)</span>
          </span>
          <input
            className="name-input"
            type="text"
            value={name}
            maxLength={NAME_MAX}
            placeholder="Sail as a guest"
            onChange={(e) => setName(e.target.value)}
            aria-invalid={nameInvalid || undefined}
          />
          <span className={nameInvalid ? "field-error" : "field-hint"}>
            {nameInvalid
              ? `Use ${NAME_MIN}–${NAME_MAX} characters, or leave blank.`
              : "Leave blank to sail under a random guest name."}
          </span>
        </label>

        <div className="menu-grid">
          <button type="button" className="btn btn-primary" onClick={play} disabled={nameInvalid}>
            Play
          </button>
          <button type="button" className="btn" onClick={onOptions}>
            Options
          </button>
          <button type="button" className="btn" onClick={onRanking}>
            Ranking
          </button>
          <button type="button" className="btn" onClick={onHistory}>
            Match History
          </button>
        </div>

        <div className="menu-secondary">
          <button type="button" className="btn-mini" onClick={playAsGuest}>
            Play as guest
          </button>
          <button type="button" className="btn-mini" onClick={() => setShowHelp(true)}>
            How to play
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="menu-modal" role="dialog" aria-modal="true" aria-label="How to play">
          <div className="panel help-panel">
            <h1 className="screen-title">How to Play</h1>
            <ul className="help-list">
              <li>
                <b>W</b> / <b>↑</b> — sail forward &nbsp;·&nbsp; <b>A D</b> / <b>← →</b> — turn
              </li>
              <li>
                <b>Space</b> — fire forward &nbsp;·&nbsp; <b>Q</b> / <b>E</b> — broadside left / right
              </li>
              <li>
                <b>Esc</b> / <b>P</b> — pause the battle
              </li>
              <li>On touch devices, use the on-screen Move and Fire buttons.</li>
              <li>Sink enemy ships before the clock runs out. Each kill is a point.</li>
            </ul>
            <div className="screen-actions">
              <button type="button" className="btn btn-primary" onClick={() => setShowHelp(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
