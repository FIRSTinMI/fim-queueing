import { Fragment } from 'preact';
// Need to use the compat package to translate svg attributes from camelCase to kebab-case
// Without this import, `textAnchor` gets rendered as-is and does not work.
import { createElement as h } from 'preact/compat';

import { BracketRound } from '../../../../shared/DoubleEliminationBracketMapping';
import { ComputedOptions, RoundHeaderOptions } from './settings';

const RoundHeader = ({
  x,
  y = 0,
  width,
  roundHeader,
  text,
}: {
  x: number,
  y: number,
  width: number,
  roundHeader: RoundHeaderOptions,
  text: string
}) => (
  <g>
    <rect
      x={x}
      y={y}
      width={width}
      height={roundHeader.height}
      fill={roundHeader.backgroundColor}
      rx="3"
      ry="3"
    />
    <text
      fontFamily={roundHeader.fontFamily}
      x={x + width / 2}
      y={y + roundHeader.height / 2}
      style={{
        fontSize: `${roundHeader.fontSize}px`,
        color: roundHeader.fontColor,
      }}
      fill="currentColor"
      dominantBaseline="middle"
      textAnchor="middle"
    >
      {text}
    </text>
  </g>
);

const RoundHeaders = ({
  rounds,
  calculatedStyles: {
    roundHeader,
    width,
  },
}: {
  rounds: BracketRound[];
  calculatedStyles: ComputedOptions;
}) => (
  <>
    {rounds.map(({ name, x }) => (
      <>
        <RoundHeader
          x={x}
          y={0}
          roundHeader={roundHeader!}
          width={width!}
          text={name}
        />
      </>
    ))}
  </>
);
export default RoundHeaders;
