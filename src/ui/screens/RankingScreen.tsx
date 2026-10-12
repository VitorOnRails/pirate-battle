import { useState } from "react";
import { useRanking } from "../../data/queries";
import { DEFAULT_PAGE_SIZE } from "../../data/contracts";
import { getPlayer } from "../../data/player";

interface RankingScreenProps {
  onBack: () => void;
}

export function RankingScreen({ onBack }: RankingScreenProps) {
  const [page, setPage] = useState(1);
  const me = getPlayer();
  const { data, isPending, isError, isFetching, refetch } = useRanking(page);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / DEFAULT_PAGE_SIZE)) : 1;

  return (
    <div className="screen">
      <div className="panel list-panel">
        <h1 className="screen-title">Ranking</h1>
        <p className="screen-subtitle">Top captains by score.</p>

        {isPending && <div className="list-empty">Loading leaderboard…</div>}

        {isError && (
          <div className="list-error">
            <p>Couldn't load the ranking.</p>
            <button type="button" className="btn btn-small" onClick={() => refetch()}>
              Try again
            </button>
          </div>
        )}

        {data && data.items.length === 0 && (
          <div className="list-empty">No scores yet — be the first!</div>
        )}

        {data && data.items.length > 0 && (
          <>
            <ol className="rows" aria-busy={isFetching}>
              {data.items.map((e) => (
                <li key={e.matchId} className={e.playerId === me.id ? "row row-me" : "row"}>
                  <span className="row-rank">#{e.rank}</span>
                  <span className="row-name">{e.playerName}</span>
                  <span className="row-score">{e.score}</span>
                </li>
              ))}
            </ol>
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

export function Pager({
  page,
  totalPages,
  busy,
  onPage,
}: {
  page: number;
  totalPages: number;
  busy: boolean;
  onPage: (p: number) => void;
}) {
  return (
    <div className="pager">
      <button
        type="button"
        className="btn btn-small"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        ‹ Prev
      </button>
      <span className="pager-info">
        Page {page} / {totalPages} {busy && "…"}
      </span>
      <button
        type="button"
        className="btn btn-small"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Next ›
      </button>
    </div>
  );
}
