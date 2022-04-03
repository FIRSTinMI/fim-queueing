import { h } from 'preact';
import type { ComponentChildren } from 'preact';
import styles from './styles.scss';

interface RankingListProps {
  children: ComponentChildren
}

function RankingList(props: RankingListProps): JSX.Element {
  const { children } = props;
  return (
    <div className={styles.ticker}>
      <div className={styles['ticker-list']}>
        {children}
      </div>
    </div>
  );
}

export default RankingList;
