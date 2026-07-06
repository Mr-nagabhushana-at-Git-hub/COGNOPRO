// Free, offline voice coach using the browser's built-in Web Speech API
// (window.speechSynthesis). No API keys, no network, no cost.

type Priority = "high" | "normal";

class Speaker {
  private enabled = false;
  private supported = typeof window !== "undefined" && "speechSynthesis" in window;
  private voice: SpeechSynthesisVoice | null = null;
  private lastSpokenAt = 0;
  private lastText = "";

  constructor() {
    if (this.supported) {
      // Voices load async in most browsers.
      const pick = () => { this.voice = this.pickVoice(); };
      pick();
      try { window.speechSynthesis.onvoiceschanged = pick; } catch { /* ignore */ }
    }
  }

  get isSupported() { return this.supported; }
  get isEnabled() { return this.enabled; }

  private pickVoice(): SpeechSynthesisVoice | null {
    if (!this.supported) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    // Prefer a natural English voice; fall back to any English, then any voice.
    return (
      voices.find((v) => /en(-|_)?(US|GB)/i.test(v.lang) && /natural|google|samantha|zira|aria/i.test(v.name)) ||
      voices.find((v) => /^en/i.test(v.lang)) ||
      voices[0] ||
      null
    );
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.cancel();
    else if (this.supported) {
      // A short greeting doubles as a user-gesture "unlock" for autoplay policies.
      this.speak("Voice coach on.", "high");
    }
  }

  toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  cancel() {
    if (this.supported) { try { window.speechSynthesis.cancel(); } catch { /* ignore */ } }
  }

  /**
   * Speak text. High priority interrupts anything in progress; normal priority is
   * dropped if something is already speaking or if it repeats recently.
   */
  speak(text: string, priority: Priority = "normal") {
    if (!this.enabled || !this.supported || !text) return;
    const now = Date.now();

    if (priority === "normal") {
      if (window.speechSynthesis.speaking) return;
      if (text === this.lastText && now - this.lastSpokenAt < 6000) return;
      if (now - this.lastSpokenAt < 2500) return;
    } else {
      this.cancel();
    }

    this.lastText = text;
    this.lastSpokenAt = now;

    const u = new SpeechSynthesisUtterance(text);
    if (this.voice) u.voice = this.voice;
    u.rate = 1.05;
    u.pitch = 1.0;
    u.volume = 1.0;
    try { window.speechSynthesis.speak(u); } catch { /* ignore */ }
  }
}

// Single shared instance across the app.
export const speaker = new Speaker();
