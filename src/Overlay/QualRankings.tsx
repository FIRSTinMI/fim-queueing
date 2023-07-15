import { h } from 'preact';
import { animated, useSpring } from '@react-spring/web';
import { useContext, useEffect, useState } from 'preact/hooks';
import {
  ref, getDatabase, onValue, off,
} from 'firebase/database';
import styled from 'styled-components';
import { EventState } from '@shared/DbTypes';
import { CGConfig, TeamRanking } from '@/types';
import RankingList from '@/components/Tickers/RankingList';
import Ranking from '@/components/Tickers/Ranking';
import AppContext from '@/AppContext';

const Ticker = styled(animated.div)<{ backgroundColor: string, textColor: string }>`
  width: 100%;
  z-index: 10;
  background: ${(props) => props.backgroundColor};
  background-attachment: fixed;
  color: ${(props) => props.textColor};
`;

function QualRankings({
  cgConfig,
}: { cgConfig: CGConfig }) {
  const { season, token, event } = useContext(AppContext);

  const [rankings, setRankings] = useState<TeamRanking[]>([]);
  const [shouldShowTicker, setShouldShowTicker] = useState<boolean>(false);
  const [backgroundColor, setBackgroundColor] = useState<string>('#000');
  const [textColor, setTextColor] = useState<string>('#fff');
  const [spring, springApi] = useSpring(() => ({
    from: {
      height: '0',
    },
  }));

  const animateOut = async () => {
    await Promise.all(springApi.start({
      height: '0',
    }));
  };

  const animateIn = async () => {
    await Promise.all(springApi.start({
      height: '2.2em',
    }));
  };

  // Decide whether the branding should *actually* be shown
  useEffect(() => {
    setShouldShowTicker((cgConfig?.showTicker ?? false)
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
    const rankingsRef = ref(getDatabase(), `/seasons/${season}/rankings/${token}`);
    onValue(rankingsRef, (snap) => {
      setRankings((snap.val() as TeamRanking[])?.sort((a, b) => a.rank - b.rank) ?? []);
    });
    return () => { off(rankingsRef); };
  }, []);

  // if (!displayedBrandingInfo) return null;
  return (
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
  );
}

export default QualRankings;
