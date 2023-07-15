import { h, Fragment } from 'preact';
import styles from './styles.module.scss';

interface RankingProps {
  ranking: number;
  teamNumber: number;
  customTextColor?: string;
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
  const formatOrdinals = (n: number): JSX.Element => {
    const rule = pr.select(n);
    const suffix = suffixes.get(rule);
    return (<>{n}<sup>{suffix}</sup></>);
  };

  return formatOrdinals(num);
}

function Ranking(props: RankingProps): JSX.Element {
  const {
    teamNumber, ranking, customTextColor,
  } = props;
  return (
    <div className={styles.newsticker} style={{ borderRightColor: customTextColor }}>
      <span className={styles.ranking} style={{ color: customTextColor, opacity: 0.8 }}>
        {numberToOrdinal(ranking)}
      </span>
      <span className={styles.teamNumber} style={{ color: customTextColor }}>{teamNumber}</span>
    </div>
  );
}

Ranking.defaultProps = {
  customTextColor: '#fff',
};

export default Ranking;
