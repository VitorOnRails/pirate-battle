import { useState } from "react";
import { useHistory } from "../../data/queries";
import { DEFAULT_PAGE_SIZE } from "../../data/contracts";
import { getPlayer } from "../../data/player";
import { Pager } from "./RankingScreen";

interface HistoryScreenProps {
  onBack: () => void;
}

export function HistoryScreen({ onBack }: HistoryScreenProps) {
  const [page, setPage] = useState(1);
  const me = getPlayer();
  const { data, isPending, isError, isFetching, refetch } = useHistory(me.id, page);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / DEFAULT_PAGE_SIZE)) : 1;

  return (
    <div className="screen">
      <div className="panel list-panel">
        <h1 className="screen-title">Match History</h1>
        <p className="screen-subtitle">Captain {me.name}</p>

        {isPending && <div className="list-empty">Loading your battles…</div>}

        {isError && (
          <div className="list-error">
            <p>Couldn't load your history.</p>
            <button type="button" className="btn btn-small" onClick={() => refetch()}>
              Try again
            </button>
          </div>
        )}

        {data && data.items.length === 0 && (
          <div className="list-empty">No matches yet — play one!</div>
        )}

        {data && data.items.length > 0 && (
          <>
            <ul className="rows" aria-busy={isFetching}>
              {data.items.map((m) => (
                <li key={m.id} className="row">
                  <span className="row-date">{new Date(m.date).toLocaleDateString()}</span>
                  <span className="row-name">
                    {m.endReason === "time" ? "Survived" : "Sunk"} · {m.durationSec}s
                  </span>
                  <span className="row-score">{m.score}</span>
                </li>
              ))}
            </ul>
            <Pager page={page} totalPages={totalPages} busy={isFetching} onPage={setPage} />
          </>
        )}

        <div className="screen-actions">
          <button type="button" className="btn btn-primary" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
