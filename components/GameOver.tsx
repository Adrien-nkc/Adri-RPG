import React from "react";

interface GameOverProps {
  onRestart: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ onRestart }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        color: "#ca2c2c",
        fontFamily: "'Press Start 2P', monospace", // Assuming a pixel font or similar
      }}
    >
      <h1 style={{ fontSize: "4rem", marginBottom: "2rem", textShadow: "4px 4px 0 #000" }}>YOU DIED</h1>
      <button
        onClick={onRestart}
        style={{
          padding: "1rem 2rem",
          fontSize: "1.5rem",
          backgroundColor: "#ca2c2c",
          color: "white",
          border: "4px solid white",
          cursor: "pointer",
          fontFamily: "inherit",
          textTransform: "uppercase",
        }}
      >
        Try Again
      </button>
    </div>
  );
};

export default GameOver;
