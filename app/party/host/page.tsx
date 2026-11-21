import type { Metadata } from "next";
import PartyHost from "../PartyHost";

export const metadata: Metadata = {
  title: "Party Host · Keep Me Away From IELTS",
};

export default function PartyHostPage() {
  return <PartyHost />;
}
