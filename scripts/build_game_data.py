"""Build the game's word lists from the exported IELTS corpus files.

Usage:
    python scripts/build_game_data.py <ielts_words.json> <ielts_chunks.json>

Writes data/words.json (single words, most frequent first) and
data/phrases.json (phrases that have a Vietnamese meaning).
Source data: https://github.com/eugenewang5425/ielts-corpus-lab (MIT).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
words_src, chunks_src = Path(sys.argv[1]), Path(sys.argv[2])

words = json.loads(words_src.read_text(encoding="utf-8"))["words"]
ranked = [w for w in words if w["overallRank"] is not None]
ranked.sort(key=lambda w: w["overallRank"])
game_words = [w["word"] for w in ranked if re.fullmatch(r"[a-z]{3,14}", w["word"])]

chunks = json.loads(chunks_src.read_text(encoding="utf-8"))["chunks"]
seen = set()
phrases = []
for c in sorted(chunks, key=lambda c: -c["count"]):
    if not c["meaningVi"] or c["phrase"] in seen:
        continue
    seen.add(c["phrase"])
    phrases.append({"text": c["phrase"], "meaning": c["meaningVi"]})

out = ROOT / "data"
out.mkdir(exist_ok=True)
(out / "words.json").write_text(json.dumps(game_words, ensure_ascii=False), encoding="utf-8")
(out / "phrases.json").write_text(json.dumps(phrases, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"words: {len(game_words)}  phrases: {len(phrases)}")
