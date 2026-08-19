import React, { useState } from "react";
import Chess from "./pages/Chess";

import "./assets/Chess.css";

export default function App() {
  const [mode, setMode] = useState("computer");

  return (
    <div className="chess-app">
      <header className="chess-header">
        <div className="eyebrow">TWO PLAYERS · ONE BOARD</div>

        <h1>
          Parlour <em>Chess</em>
        </h1>

        <div className="mode-buttons">
          <button
            className={mode === "computer" ? "active" : ""}
            onClick={() => setMode("computer")}
          >
            🤖 Computer
          </button>

          <button
            className={mode === "local" ? "active" : ""}
            onClick={() => setMode("local")}
          >
            👥 2 Players
          </button>
        </div>
      </header>

      <Chess mode={mode} />
    </div>
  );
}