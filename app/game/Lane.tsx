// The falling-words lane (words, boss, score popups, banners, ground), shared by solo and party play.
import { targetOf, type Boss, type FallingItem, type GameState } from "./engine";

export function Lane({ state, showMeaning }: { state: GameState; showMeaning: boolean }) {
  const target = targetOf(state);
  return (
    <div className="lane">
      {state.boss && (
        <BossView
          boss={state.boss}
          typed={state.typed}
          isTarget={!!target && !target.item}
          elapsed={state.elapsed}
          showMeaning={showMeaning}
        />
      )}
      {state.items.map((item) => (
        <FallingWord
          key={item.id}
          item={item}
          typed={state.typed}
          isTarget={!!target?.item && item.id === target.item.id}
          showMeaning={showMeaning}
        />
      ))}
      {state.popups.map((popup) => (
        <div
          key={popup.id}
          className={`popup tone-${popup.tone}`}
          style={{ left: `${popup.x}%`, top: `${popup.y * 100}%`, animationDuration: `${popup.ttl}s` }}
        >
          {popup.tone === "heart" && (
            <span className="popup-heart" aria-hidden>
              ♥
            </span>
          )}
          <span className="popup-points">{popup.label}</span>
          {popup.meaning && <span className="popup-meaning">{popup.meaning}</span>}
        </div>
      ))}
      {state.banner && state.status === "playing" && (
        <div key={`${state.banner.text}-${state.banner.at}`} className={`banner ${state.banner.tone}`}>
          <strong>{state.banner.text}</strong>
          {state.banner.sub && <span>{state.banner.sub}</span>}
        </div>
      )}
      <div className="ground" />
    </div>
  );
}

function TypedText({ text, typed }: { text: string; typed: string }) {
  const hit = typed && text.startsWith(typed) ? typed.length : 0;
  return (
    <span className="word-text">
      <span className="word-done">{text.slice(0, hit)}</span>
      {text.slice(hit)}
    </span>
  );
}

function FallingWord(props: { item: FallingItem; typed: string; isTarget: boolean; showMeaning: boolean }) {
  const { item } = props;
  const classes = [
    "word",
    item.kind !== "normal" && `kind-${item.kind}`,
    props.isTarget && "is-target",
    item.kind !== "heart" && item.y > 0.72 && "danger",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} style={{ left: `${item.x}%`, top: `${item.y * 100}%` }}>
      <span className="word-line">
        {item.kind === "heart" && <span className="word-badge" aria-label="+1 mạng">♥</span>}
        <TypedText text={item.text} typed={props.typed} />
      </span>
      {props.showMeaning && item.meaning && <span className="word-meaning">{item.meaning}</span>}
    </div>
  );
}

function BossView(props: { boss: Boss; typed: string; isTarget: boolean; elapsed: number; showMeaning: boolean }) {
  const { boss } = props;
  const hurt = props.elapsed - boss.hitAt < 0.35;
  const charge = 1 - Math.max(0, boss.attackIn) / boss.attackEvery;
  return (
    <div className={hurt ? "boss hurt" : "boss"}>
      <div className="boss-head">
        <span className="boss-emoji" aria-hidden>
          {boss.emoji}
        </span>
        <div className="boss-info">
          <strong>{boss.name}</strong>
          <div className="boss-hp" aria-label={`Máu boss ${boss.hp}/${boss.maxHp}`}>
            <span style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }} />
          </div>
          <div className="boss-charge" aria-hidden>
            <span style={{ width: `${charge * 100}%` }} />
          </div>
        </div>
      </div>
      {boss.word && (
        <div className={props.isTarget ? "boss-word is-target" : "boss-word"}>
          <TypedText text={boss.word.text} typed={props.typed} />
          {props.showMeaning && boss.word.meaning && <span className="word-meaning">{boss.word.meaning}</span>}
        </div>
      )}
    </div>
  );
}
