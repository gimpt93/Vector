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
    title: "Think over anything",
    detail: "Open the desktop overlay. The blue edge means Vector is ready to draw.",
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
    <div className="welcome-backdrop" role="presentation">
      <section
        className="welcome-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        aria-describedby="welcome-description"
      >
        <button className="welcome-close" type="button" onClick={onDismiss} aria-label="Close welcome guide">×</button>
        <div className="welcome-heading">
          <span className="welcome-mark">V</span>
          <div>
            <p className="welcome-eyebrow">WELCOME TO VECTOR</p>
            <h1 id="welcome-title">Your thoughts, above everything.</h1>
            <p id="welcome-description">A keyboard-first glassboard for notes, lists, and quick sketches—without leaving the work underneath.</p>
          </div>
        </div>

        <div className="welcome-grid">
          {guideItems.map((item) => (
            <article className="welcome-step" key={item.number}>
              <span className="welcome-step-number">{item.number}</span>
              <div>
                <h2>{item.title}</h2>
                <p>{item.detail}</p>
                <div className="welcome-keys" aria-label={item.keys.join(" plus ")}>
                  {item.keys.map((key) => <kbd key={key}>{key}</kbd>)}
                </div>
              </div>
            </article>
          ))}
        </div>

        <footer className="welcome-actions">
          <button className="welcome-secondary" type="button" onClick={onDismiss}>Explore on my own</button>
          <button className="primary-button welcome-primary" type="button" onClick={onStart} autoFocus>Create a board</button>
        </footer>
      </section>
    </div>
  );
}
