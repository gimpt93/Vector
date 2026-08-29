import { useEffect } from "react";

type WelcomeGuideProps = {
  onDismiss: () => void;
  onStart: () => void;
};

const guideItems = [
  {
    number: "01",
    title: "Type first",
    detail: "Double-click anywhere to place a large, editable note.",
    keys: ["Double-click"],
  },
  {
    number: "02",
    title: "Keep the thought moving",
    detail: "Use Shift + Enter for another line. Lists continue automatically.",
    keys: ["Shift", "Enter"],
  },
  {
    number: "03",
    title: "Arrange freely",
    detail: "Hold Ctrl while dragging to move notes and marker strokes.",
    keys: ["Ctrl", "Drag"],
  },
  {
    number: "04",
    title: "Pin it to your desktop",
    detail: "Make Vector your desktop board. Normal apps cover it automatically.",
    keys: ["Ctrl", "Shift", "V"],
  },
];

export default function WelcomeGuide({ onDismiss, onStart }: WelcomeGuideProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

  return (
    <section className="home-guide" aria-labelledby="welcome-title" aria-describedby="welcome-description">
      <button className="welcome-close" type="button" onClick={onDismiss} aria-label="Hide quick guide">×</button>
      <div className="welcome-heading">
        <span className="welcome-mark">V</span>
        <div>
          <p className="welcome-eyebrow">QUICK START</p>
          <h2 id="welcome-title">Think first. Draw second.</h2>
          <p id="welcome-description">Open a board and double-click anywhere to start typing. Everything else can wait until you need it.</p>
        </div>
      </div>

      <div className="welcome-grid">
        {guideItems.map((item) => (
          <article className="welcome-step" key={item.number}>
            <span className="welcome-step-number">{item.number}</span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
              <div className="welcome-keys" aria-label={item.keys.join(" plus ")}>
                {item.keys.map((key) => <kbd key={key}>{key}</kbd>)}
              </div>
            </div>
          </article>
        ))}
      </div>

      <footer className="welcome-actions">
        <button className="primary-button welcome-primary" type="button" onClick={onStart}>Create a board</button>
      </footer>
    </section>
  );
}
