import { h, Fragment, FunctionalComponent } from 'preact';

import RoundHeaders from './RoundHeaders';
import MatchWrapper from './MatchWrapper';
import DoubleEliminationBracketMapping, {
  BracketMatch, BracketMatchNumber, BracketRound, WinnerSource,
} from '../../../../shared/DoubleEliminationBracketMapping';
import { defaultStyle, getCalculatedStyles } from './settings';
import { MatchComponentProps } from './Match';
import { Alliance } from '../../../types';
import { PlayoffMatch } from '../../../../shared/DbTypes';

const DoubleEliminationBracket = ({
  matchResults,
  matchComponent,
  alliances,
}: {
  matchResults: Record<BracketMatchNumber, PlayoffMatch> | undefined,
  matchComponent: FunctionalComponent<MatchComponentProps>,
  alliances: Alliance[],
}) => {
  // TODO: I really do not like this whole calculated styles thing, and I don't
  // think we're even using it. Consider removing for a simpler solution.
  const calculatedStyles = getCalculatedStyles(defaultStyle);

  const { matches, rounds } = DoubleEliminationBracketMapping;

  const {
    roundHeader,
    boxHeight,
    heightMultiplier,
    width,
    columnWidth,
    roundSeparatorWidth,
    connectorColor,
    connectorOffsetY,
    spaceBetweenColumns,
  } = calculatedStyles;

  const bracket = rounds.map((round) => ({
    round,
    matches: matches.filter((m) => m.round === round.name),
  }));

  const getMatchPosition = (round: BracketRound, match: BracketMatch) => ({
    x: round.x,
    y: (match.y * heightMultiplier) + roundHeader.height + roundHeader.marginBottom,
  });

  const getMatchBeginCenter = (round: BracketRound, match: BracketMatch) => {
    const matchPosition = getMatchPosition(round, match);
    return {
      x: matchPosition.x,
      y: matchPosition.y + connectorOffsetY + boxHeight / 2,
    };
  };

  const getMatchEndCenter = (round: BracketRound, match: BracketMatch) => {
    const matchPosition = getMatchPosition(round, match);
    return {
      x: matchPosition.x + width,
      y: matchPosition.y + connectorOffsetY + boxHeight / 2,
    };
  };

  const buildConnectorLine = (start: { x: number, y: number }, end: { x: number, y: number })
  : string => {
    if (start.y === end.y) return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    const verticalLineX = start.x + roundSeparatorWidth;
    return `M ${start.x} ${start.y} L ${verticalLineX} ${start.y} L ${verticalLineX} ${end.y} L ${end.x} ${end.y}`;
  };

  const getLineStartFromWinnerSource = (source: WinnerSource) => {
    const prevMatch = matches.find((nm) => (
      nm.number === source.winnerFrom
    ));

    if (prevMatch) {
      const prevRound = rounds.find((nr) => nr.name === prevMatch.round);
      if (prevRound) {
        return getMatchEndCenter(prevRound, prevMatch);
      }
    }

    return undefined;
  };

  return (
    <div>
      <svg
        height="100%"
        width="100%"
        // This viewbox results in all units used within the SVG being
        // relative. Don't trust that any measurements you see translate to
        // real pixels.
        viewBox={
          '0 0 '
          + `${rounds.slice(-1)[0].x + columnWidth - roundSeparatorWidth - (spaceBetweenColumns / 2)} `
          + `${Math.max(...matches.map((m) => (
            (m.y * heightMultiplier) + boxHeight + roundHeader.height
            + roundHeader.marginBottom
          )))}`
        }
      >
        <g>
          <RoundHeaders
            rounds={rounds}
            calculatedStyles={calculatedStyles}
          />
          {bracket.map(({ round, matches: roundMatches }) => roundMatches.map((match) => {
            const { x, y } = getMatchPosition(round, match);
            // Find all of the lines originating from this match
            const lines = [];
            if ('winnerFrom' in match.participants.red) {
              const lineStart = getLineStartFromWinnerSource(match.participants.red);
              if (lineStart) {
                lines.push(buildConnectorLine(
                  lineStart,
                  getMatchBeginCenter(round, match),
                ));
              }
            }
            if ('winnerFrom' in match.participants.blue) {
              const lineStart = getLineStartFromWinnerSource(match.participants.blue);
              if (lineStart) {
                lines.push(buildConnectorLine(
                  lineStart,
                  getMatchBeginCenter(round, match),
                ));
              }
            }

            return (
              <>
                <MatchWrapper
                  key={match.number}
                  x={x}
                  y={y}
                  match={match}
                  matchResult={matchResults ? matchResults[match.number] : undefined}
                  alliances={alliances}
                  style={calculatedStyles}
                  matchComponent={matchComponent}
                />
                {lines.map((line) => (
                  <path
                    d={line}
                    id={`connector-${round.x}-${match.y}-${-1}`}
                    fill="transparent"
                    stroke={connectorColor}
                  />
                ))}
              </>
            );
          }))}
        </g>
      </svg>
    </div>
  );
};

export default DoubleEliminationBracket;
