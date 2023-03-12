import { FunctionalComponent, h } from 'preact';

import { PlayoffMatch } from '@shared/DbTypes';
import { BracketMatch } from '@shared/DoubleEliminationBracketMapping';
import { Alliance } from '@/types';
import { defaultStyle, getCalculatedStyles, Options } from './settings';
import { MatchComponentProps } from './Match';

function MatchWrapper({
  match,
  matchResult,
  alliances,
  x,
  y,
  style = defaultStyle,
  matchComponent: MatchComponent,
}: {
  match: BracketMatch,
  matchResult: PlayoffMatch | undefined,
  alliances: Alliance[],
  x: number,
  y: number,
  style: Options,
  matchComponent: FunctionalComponent<MatchComponentProps>
}) {
  const computedStyles = getCalculatedStyles(style);
  const { width = 300, boxHeight = 70 } = computedStyles;

  // TODO: Do we really need this wrapper? Seems kinda pointless at this point.
  return (
    <svg
      width={width}
      height={boxHeight}
      viewBox={`0 0 ${width} ${boxHeight}`}
      x={x}
      y={y}
    >
      <foreignObject x={0} y={0} width={width} height={boxHeight} dominantBaseline="middle" textAnchor="middle">
        {MatchComponent && (
          <MatchComponent
            matchName={(match.number === 'F' ? 'Final (Bo3)' : `Match ${match.number}`)}
            matchResult={matchResult}
            red={match.participants.red}
            blue={match.participants.blue}
            alliances={alliances}
          />
        )}
      </foreignObject>
    </svg>
  );
}

export default MatchWrapper;
