import { ABILITY_LABEL, GEM_LABEL } from '../../shared/constants/labels';
import type { AbilityType, GemColor, JewelCardDef, RoyalCardDef } from '../../shared/types/game';
import { GemCost } from './GemCost';

type Props = {
  card: JewelCardDef | RoyalCardDef;
};

const colorClass: Record<string, string> = {
  white: 'card-white',
  blue: 'card-blue',
  green: 'card-green',
  red: 'card-red',
  black: 'card-black',
};

const abilityIcon: Record<AbilityType, string> = {
  EXTRA_TURN: '↻',
  TAKE_PRIVILEGE: '卷',
  TAKE_MATCHING_TOKEN: '◆',
  STEAL_TOKEN: '⇄',
  COPY_BONUS: '◎',
};

const bonusIcon: Record<GemColor, string> = {
  white: '白',
  blue: '蓝',
  green: '绿',
  red: '红',
  black: '黑',
};

export function CardView({ card }: Props) {
  const tone = card.bonusColor ? colorClass[card.bonusColor] : card.cardType === 'royal' ? 'card-royal' : 'card-neutral';
  const specialLabel = card.cardType === 'gold' ? '金卡' : card.cardType === 'associate' ? '联结' : card.kind === 'royal' ? '皇室' : '';

  return (
    <article className={`game-card ${tone}`} title={card.name}>
      <div className="card-corner-stack">
        <div className="score-line">
          <span className="prestige-badge">{card.prestige}</span>
          {card.crowns > 0 && <span className="crown-badge" title={`${card.crowns} 个王冠`}>👑x{card.crowns}</span>}
        </div>

        {card.ability && (
          <div className="ability-badge" title={ABILITY_LABEL[card.ability]}>
            <span>{abilityIcon[card.ability]}</span>
            <small>{ABILITY_LABEL[card.ability]}</small>
          </div>
        )}

        {card.bonusColor ? (
          <div className="bonus-badge" title={`${GEM_LABEL[card.bonusColor]} bonus x1`}>
            <span className={`gem-dot gem-${card.bonusColor}`}>{bonusIcon[card.bonusColor]}</span>
            <span className="gem-times">x</span>
            <strong>1</strong>
          </div>
        ) : specialLabel ? (
          <div className={`special-badge special-${card.cardType}`}>{specialLabel}</div>
        ) : null}
      </div>

      <div className="level-pill">{card.kind === 'royal' ? 'Royal' : `L${card.level}`}</div>
      <div className="card-art-mark" aria-hidden="true" />

      {'cost' in card && Object.keys(card.cost).length > 0 && (
        <div className="card-cost-panel">
          <GemCost cost={card.cost} compact />
        </div>
      )}
    </article>
  );
}
