"""Build the game's word lists from the exported IELTS corpus files.

Usage:
    python scripts/build_game_data.py <ielts_words.json> <ielts_chunks.json>
        [--meanings data/source/word_meanings_vi.json]
        [--drop data/source/word_blocklist.json] [--strict]

Writes data/words.json (single words, most frequent first, with Vietnamese
meanings) and data/phrases.json (phrases that have a Vietnamese meaning).
--drop removes OCR junk and malformed lemmas found in the source corpus.
--strict fails if any kept word has no meaning.
Source data: https://github.com/eugenewang5425/ielts-corpus-lab (MIT).
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

parser = argparse.ArgumentParser()
parser.add_argument("words")
parser.add_argument("chunks")
parser.add_argument("--meanings")
parser.add_argument("--drop")
parser.add_argument("--strict", action="store_true")
args = parser.parse_args()


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8")) if path else None


meanings = load(args.meanings) or {}
drop = set(load(args.drop) or [])

words = load(args.words)["words"]
ranked = sorted((w for w in words if w["overallRank"] is not None), key=lambda w: w["overallRank"])
game_words = []
for w in ranked:
    if not re.fullmatch(r"[a-z]{3,14}", w["word"]) or w["word"] in drop:
        continue
    entry = {"text": w["word"]}
    if meanings.get(w["word"]):
        entry["meaning"] = meanings[w["word"]]
    game_words.append(entry)

missing = [w["text"] for w in game_words if "meaning" not in w]
if missing:
    message = f"{len(missing)} words have no meaning, e.g. {missing[:10]}"
    if args.strict:
        sys.exit(message)
    print("warning:", message)

seen = set()
phrases = []
for c in sorted(load(args.chunks)["chunks"], key=lambda c: -c["count"]):
    if not c["meaningVi"] or c["phrase"] in seen:
        continue
    seen.add(c["phrase"])
    phrases.append({"text": c["phrase"], "meaning": c["meaningVi"]})

out = ROOT / "data"
out.mkdir(exist_ok=True)
(out / "words.json").write_text(json.dumps(game_words, ensure_ascii=False), encoding="utf-8")
(out / "phrases.json").write_text(json.dumps(phrases, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"words: {len(game_words)} (dropped {len(drop)})  phrases: {len(phrases)}")
