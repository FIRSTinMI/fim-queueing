import { h, createRef, RefObject } from 'preact';
import { useEffect } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import styles from './styles.scss';

interface RankingListProps {
  children: ComponentChildren,
  customBgColor?: string,
}

function RankingList(props: RankingListProps): JSX.Element {
  const { children, customBgColor } = props;
  const listRef: RefObject<HTMLDivElement> = createRef();
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.style.animationDuration = `${(listRef.current.clientWidth / 75)}s`;
  }, [listRef]);
  return (
    <div className={styles.ticker} style={{backgroundColor: customBgColor || "#0c0e15"}}>
      <div className={styles['ticker-list']} ref={listRef}>
        {children}
      </div>
    </div>
  );
}

export default RankingList;
