import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

// A tap you can feel when a set is ticked off, and a buzz + beep when rest
// is over — you're not looking at the screen between sets.

export function tapFeedback() {
  if (Capacitor.isNativePlatform()) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  else navigator.vibrate?.(15);
}

let audio: AudioContext | null = null;

export function restDoneFeedback() {
  if (Capacitor.isNativePlatform()) void Haptics.notification({ type: NotificationType.Success }).catch(() => {});
  else navigator.vibrate?.([200, 100, 200]);
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    for (const [i, freq] of [880, 1320].entries()) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, t + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.18 + 0.16);
      osc.connect(gain).connect(audio.destination);
      osc.start(t + i * 0.18);
      osc.stop(t + i * 0.18 + 0.17);
    }
  } catch {
    // No audio available; the vibration is enough.
  }
}
