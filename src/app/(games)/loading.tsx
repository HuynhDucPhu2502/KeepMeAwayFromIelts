export default function GamesLoading() {
  return (
    <div className="game ws-page" aria-busy="true">
      <div className="overlay">
        <div className="card card-small status-card">
          <p className="muted">Đang mở game…</p>
        </div>
      </div>
    </div>
  );
}
