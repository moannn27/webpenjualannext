export function playOrderNotificationChime() {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;

    // Chime notes: C5 (523.25 Hz), E5 (659.25 Hz), G5 (783.99 Hz)
    const notes = [
      { freq: 523.25, time: now },
      { freq: 659.25, time: now + 0.12 },
      { freq: 783.99, time: now + 0.24 },
    ];

    notes.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.18, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.5);
    });

    // Close context after playback
    setTimeout(() => {
      try {
        void ctx.close();
      } catch {
        // ignore
      }
    }, 1000);
  } catch {
    // Audio autoplay restrictions before first user gesture
  }
}

