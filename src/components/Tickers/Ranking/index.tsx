import { h } from 'preact';
import styles from './styles.scss';

interface RankingProps {
  ranking: number;
  teamNumber: number;
}

function numberToOrdinal(num: number) {
  if (Number.isNaN(num)) return num;

  const pr = new Intl.PluralRules('en-US', { type: 'ordinal' });

  const suffixes = new Map([
    ['one', 'st'],
    ['two', 'nd'],
    ['few', 'rd'],
    ['other', 'th'],
  ]);
  const formatOrdinals = (n: number) => {
    const rule = pr.select(n);
    const suffix = suffixes.get(rule);
    return `${n}${suffix}`;
  };

  return formatOrdinals(num);
}

function Ranking(props: RankingProps): JSX.Element {
  const { teamNumber, ranking } = props;
  return (
    <div className={styles.newsticker}>
      <span className={styles.ranking}>{numberToOrdinal(ranking)}</span>
      <span className={styles.teamNumber}>{teamNumber}</span>
    </div>
  );
}

export default Ranking;
