import { h, createRef, RefObject } from 'preact';
import { useEffect } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { CSSProperties } from 'preact/compat';
import styles from './styles.module.scss';

interface RankingListProps {
  children: ComponentChildren,
  customBgColor?: string,
  animationModifier?: number,
  style?: CSSProperties,
}

function RankingList(props: RankingListProps): JSX.Element {
  const {
    children, customBgColor, animationModifier, style,
  } = props;
  const listRef: RefObject<HTMLDivElement> = createRef();
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.style.animationDuration = `${(listRef.current.clientWidth / animationModifier!)}s`;
  }, [listRef]);
  return (
    <div className={styles.ticker} style={{ background: customBgColor, ...style }}>
      <div className={styles['ticker-list']} ref={listRef}>
        {children}
      </div>
    </div>
  );
}

RankingList.defaultProps = {
  customBgColor: '#0c0e15',
  animationModifier: 75,
  style: {},
};

export default RankingList;
