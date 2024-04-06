import { h, Fragment } from 'preact';
import { animated, useSpring } from '@react-spring/web';
import {
  useContext, useEffect, useState, useRef,
} from 'preact/hooks';
import {
  ref, getDatabase, onValue, off,
} from 'firebase/database';
import styled from 'styled-components';
import { EventState } from '@shared/DbTypes';
import { CGConfig, TeamRanking } from '@/types';
import RankingList from '@/components/Tickers/RankingList';
import Ranking from '@/components/Tickers/Ranking';
import AppContext from '@/AppContext';

const TickerHeight = '1.5em';
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const units = {
  day: 24 * 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  minute: 60 * 1000,
  second: 1000,
};

const Ticker = styled(animated.div)<{ backgroundColor: string, textColor: string }>`
  width: 100%;
  z-index: 10;
  background: ${(props) => props.backgroundColor};
  background-attachment: fixed;
  color: ${(props) => props.textColor};
`;

const AsOf = styled(animated.div)<{ backgroundColor: string, textColor: string }>`
  position: absolute;
  right: 0;
  padding-bottom: 0;
  background: ${(props) => props.backgroundColor};
  color: ${(props) => props.textColor};
  padding-left: 1em;
  padding-right: 2em;
  padding-block: 0.2em;
  -webkit-clip-path: polygon(0.8em 0, calc(100%) 0, 100% 100%, 0 100%);
  clip-path: polygon(0.8em 0, calc(100%) 0, 100% 100%, 0 100%);
  div {
    font-size: 0.5em;
  }
`;

function QualRankings({
  cgConfig,
}: { cgConfig: CGConfig }) {
  const { season, token, event } = useContext(AppContext);

  const [rankings, setRankings] = useState<TeamRanking[]>([]);
  const [lastModified, setLastModified] = useState<number | null>(null);
  const lastModifiedRef = useRef<ReturnType<typeof setTimeout> | null>();
  const [asOf, setAsOf] = useState<string | null>(null);
  const [shouldShowTicker, setShouldShowTicker] = useState<boolean>(false);
  const [backgroundColor, setBackgroundColor] = useState<string>('#000');
  const [textColor, setTextColor] = useState<string>('#fff');
  const [spring, springApi] = useSpring(() => ({
    from: {
      height: '0',
    },
  }));
  const [asOfSpring, asOfSpringApi] = useSpring(() => ({
    from: {
      bottom: '-0.3em',
      right: '-50%',
    },
  }));

  const animateOut = async () => {
    const anim1 = asOfSpringApi.start({
      bottom: '-0.3em',
      right: '-50%',
    });

    const anim2 = springApi.start({
      height: '0',
    });

    await Promise.all([...anim1, ...anim2]);
  };

  const animateIn = async (forceAsOf: boolean = false) => {
    const anim1 = springApi.start({
      height: TickerHeight,
    });

    let anim2: Promise<any>[] = [];
    if (forceAsOf || lastModified !== null) {
      anim2 = asOfSpringApi.start({
        bottom: TickerHeight,
        right: '0',
      });
    }

    await Promise.all([...anim1, ...anim2]);
  };

  // Decide whether the ticker should *actually* be shown
  useEffect(() => {
    setShouldShowTicker((cgConfig?.showTicker ?? true)
      && (['QualsInProgress', 'AwaitingAlliances'] as EventState[]).includes(event?.state!)
      && rankings.length > 0);
  }, [
    cgConfig?.showTicker,
    event?.state,
    rankings.length,
  ]);

  // Handle in/out animations
  useEffect(() => {
    if (!shouldShowTicker) {
      animateOut();
    } else {
      animateIn();
    }
  }, [shouldShowTicker]);

  // Animate out before updating the displayed branding
  useEffect(() => {
    const updateInfo = () => {
      setBackgroundColor(cgConfig?.tickerBg ?? '#000');
      setTextColor(cgConfig?.tickerTextColor ?? '#fff');
    };
    if (!shouldShowTicker) {
      updateInfo();
      return;
    }
    (async () => {
      await animateOut();
      updateInfo();
      await new Promise((res) => { setTimeout(res, 100); });
      await animateIn();
    })();
  }, [cgConfig?.tickerBg, cgConfig?.tickerTextColor]);

  useEffect(() => {
    const database = getDatabase();
    const rankingsRef = ref(database, `/seasons/${season}/rankings/${token}`);
    onValue(rankingsRef, (snap) => {
      setRankings((snap.val() as TeamRanking[])?.sort((a, b) => a.rank - b.rank) ?? []);
    });

    const lastModifiedDbRef = ref(database, `/seasons/${season}/events/${token}/lastModifiedMs`);
    onValue(lastModifiedDbRef, (snap) => {
      const val = snap.val() as number;
      console.log('setting last modified', snap.val());
      setLastModified((prev) => {
        if (cgConfig.showTicker && prev === null && val !== null) animateIn(true);
        return val;
      });
    });

    return () => {
      off(rankingsRef);
      off(lastModifiedDbRef);
    };
  }, []);

  const calculateAsOf = () => {
    if (!lastModified) {
      setAsOf(null);
      return;
    }

    const elapsed = lastModified - Date.now();
    const [unit, val] = Object.entries(units).filter(([u, v]) => Math.abs(elapsed) > v || u === 'second')[0];
    if (Math.abs(elapsed) > val || unit === 'second') {
      setAsOf(rtf.format(Math.round(elapsed / val), unit as any));
    }
  };

  useEffect(() => {
    if (lastModifiedRef.current) clearInterval(lastModifiedRef.current);

    calculateAsOf();
    lastModifiedRef.current = setInterval(calculateAsOf, 5_000);

    return () => {
      if (lastModifiedRef.current) clearInterval(lastModifiedRef.current);
    };
  }, [lastModified]);

  // if (!displayedBrandingInfo) return null;
  return (
    <>
      {false && lastModified && (
        <AsOf
          style={asOfSpring}
          backgroundColor={backgroundColor}
          textColor={textColor}
        >
          <div>As of {asOf}</div>
        </AsOf>
      )}
      <Ticker
        style={spring}
        backgroundColor={backgroundColor}
        textColor={textColor}
      >
        <RankingList customBgColor={backgroundColor} animationModifier={75}>
          {rankings.map((x) => (
            <Ranking
              teamNumber={x.teamNumber}
              ranking={x.rank}
              customTextColor={textColor}
            />
          ))}
        </RankingList>
      </Ticker>
    </>
  );
}

export default QualRankings;
