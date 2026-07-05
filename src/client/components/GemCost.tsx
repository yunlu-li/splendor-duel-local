import { TOKEN_LABEL } from '../../shared/constants/labels';
import type { TokenColor, TokenCounts } from '../../shared/types/game';

const TOKEN_ORDER: TokenColor[] = ['white', 'blue', 'green', 'red', 'black', 'pearl', 'gold'];

type Props = {
  cost: TokenCounts;
  emptyText?: string;
  compact?: boolean;
};

export function GemCost({ cost, emptyText = '免费', compact = false }: Props) {
  const entries = TOKEN_ORDER.filter((color) => cost[color]);
  if (entries.length === 0) return <span className="cost-empty">{emptyText}</span>;

  return (
    <div className={`gem-cost ${compact ? 'compact' : ''}`}>
      {entries.map((color) => (
        <span className="gem-cost-item" key={color} title={`${cost[color]} ${TOKEN_LABEL[color]}`}>
          <span className={`gem-dot gem-${color}`}>{TOKEN_LABEL[color].slice(0, 1)}</span>
          <span className="gem-times">x</span>
          <strong>{cost[color]}</strong>
        </span>
      ))}
    </div>
  );
}
