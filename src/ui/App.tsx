import { useState } from "react";
import { GameCanvas } from "./GameCanvas";
import { MenuScreen } from "./screens/MenuScreen";
import { OptionsScreen } from "./screens/OptionsScreen";
import { RankingScreen } from "./screens/RankingScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { loadSettings, saveSettings, type MatchSettings } from "../engine/settings";
import { useRetryPending } from "../data/useRetryPending";
import "../styles/screens.css";

type Screen = "menu" | "options" | "playing" | "ranking" | "history";

export function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [settings, setSettings] = useState<MatchSettings>(loadSettings);

  useRetryPending();

  const screenEl = renderScreen();

  function renderScreen() {
    switch (screen) {
      case "playing":
        return <GameCanvas settings={settings} onExitToMenu={() => setScreen("menu")} />;

      case "options":
        return (
          <OptionsScreen
            settings={settings}
            onSave={(next) => {
              setSettings(next);
              saveSettings(next);
              setScreen("menu");
            }}
            onCancel={() => setScreen("menu")}
          />
        );

      case "ranking":
        return <RankingScreen onBack={() => setScreen("menu")} />;

      case "history":
        return <HistoryScreen onBack={() => setScreen("menu")} />;

      case "menu":
      default:
        return (
          <MenuScreen
            onPlay={() => setScreen("playing")}
            onOptions={() => setScreen("options")}
            onRanking={() => setScreen("ranking")}
            onHistory={() => setScreen("history")}
          />
        );
    }
  }

  return (
    <>
      {screenEl}
      <div className="rotate-notice" role="dialog" aria-label="Rotate your device">
        <div className="rotate-notice-inner">
          <div className="rotate-icon" aria-hidden="true">📱</div>
          <h1>Rotate your device</h1>
          <p>Pirate Battle sets sail in landscape. Turn your device sideways to play.</p>
        </div>
      </div>
    </>
  );
}
