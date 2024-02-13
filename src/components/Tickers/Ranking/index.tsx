import { h } from 'preact';
import styles from './styles.module.scss';
import numberToOrdinal from '@/util/numberToOrdinal';

interface RankingProps {
  ranking: number;
  teamNumber: number;
  customTextColor?: string;
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
