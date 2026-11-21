"use client";

// Small pieces shared by the party player and host pages.
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { DIFFICULTIES, type Difficulty, type Mode } from "../game/engine";

export type Availability = "loading" | "on" | "off" | "error";

/** Asks the server whether party mode is switched on (PARTY_HOST_PIN set). */
export function usePartyAvailability(): Availability {
  const [availability, setAvailability] = useState<Availability>("loading");
  useEffect(() => {
    let active = true;
    fetch("/api/party/host", { cache: "no-store" })
      .then(async (res): Promise<Availability> => {
        if (res.status === 404) return "off";
        if (!res.ok) return "error";
        const data = (await res.json()) as { enabled?: boolean };
        return data.enabled === true ? "on" : "off";
      })
      .catch((): Availability => "error")
      .then((value) => {
        if (active) setAvailability(value);
      });
    return () => {
      active = false;
    };
  }, []);
  return availability;
}

export const MODE_LABEL: Record<Mode, string> = { words: "Từ đơn", phrases: "Cụm từ" };

export const settingsLabel = (mode: Mode, difficulty: Difficulty) =>
  `${MODE_LABEL[mode]} · ${DIFFICULTIES[difficulty].label}`;

export function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** A centred card over the field, in the solo game's overlay style. */
export function Notice({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="overlay">
      <div className="card card-small party-notice">
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function AvailabilityNotice({ availability }: { availability: Availability }) {
  if (availability === "loading") return <Notice title="Đang tải…" />;
  if (availability === "off")
    return (
      <Notice title="Party mode chưa bật">
        <p className="muted small">Máy chủ này chưa bật chế độ nhiều người. Bạn vẫn có thể chơi đơn ở trang chủ.</p>
        <Link className="btn" href="/">
          Chơi đơn
        </Link>
      </Notice>
    );
  return (
    <Notice title="Không kết nối được máy chủ">
      <p className="muted small">Kiểm tra mạng rồi tải lại trang nhé.</p>
    </Notice>
  );
}

export function errorText(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("chưa được cấu hình")) return message;
  return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại nhé.";
}
