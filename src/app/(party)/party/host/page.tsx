import { pageMetadata } from "@/lib/seo";
import PartyHost from "../_components/PartyHost";

export const metadata = pageMetadata({
  title: "Party Host",
  description: "Màn hình điều khiển phòng đấu Party Mode cho giáo viên và sự kiện.",
  path: "/party/host",
  noIndex: true,
});

export default function PartyHostPage() {
  return <PartyHost />;
}
