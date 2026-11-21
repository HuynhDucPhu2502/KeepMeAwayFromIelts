"use client";

import { useSyncExternalStore } from "react";
import { isSfxEnabled, subscribeSfx, toggleSfx } from "@/lib/sfx";

export function SoundToggle() {
  const enabled = useSyncExternalStore(subscribeSfx, isSfxEnabled, () => true);
  return (
    <button
      type="button"
      className={enabled ? "hud-sfx on" : "hud-sfx"}
      onClick={() => toggleSfx()}
      aria-label={enabled ? "Tắt âm thanh hiệu ứng" : "Bật âm thanh hiệu ứng"}
      title={enabled ? "Đang bật âm thanh (bấm để tắt)" : "Đang tắt âm thanh (bấm để bật)"}
    >
      <span aria-hidden>{enabled ? "🔊" : "🔇"}</span>
      <span className="hud-sfx-label">{enabled ? "Âm thanh" : "Tắt tiếng"}</span>
    </button>
  );
}
