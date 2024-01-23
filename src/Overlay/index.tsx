import { h } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import { animated } from '@react-spring/web';
import { getDatabase, onValue, ref } from 'firebase/database';
import styled from 'styled-components';
import LowerThird from './LowerThird';
import EventBranding from './EventBranding';
import QualRankings from './QualRankings';
import { CGConfig } from '@/types';
import AppContext from '@/AppContext';

const StyledOverlay = styled.div<{ background: string }>`
  font-size: 4vh;
  height: 100vh;
  overflow: hidden;
  background: ${({ background }) => background};
`;

export default function Overlay() {
  const [cgConfig, setCgConfig] = useState<CGConfig | undefined>();

  const { season, token } = useContext(AppContext);

  useEffect(() => {
    const cgRef = ref(getDatabase(), `/seasons/${season}/cg/${token}`);
    onValue(cgRef, (snap) => {
      setCgConfig(snap.val() as CGConfig ?? {});
    });
  }, []);

  // Hacky to support old versions of chrome because the :has() CSS selector is new
  // Add and remove class on the body element
  useEffect(() => {
    document.querySelector('body')?.classList.add('no-background-color');
    return () => document.querySelector('body')?.classList.remove('no-background-color');
  });

  if (cgConfig === undefined) return null;
  return (
    <StyledOverlay className="--no-body-background-color" background={cgConfig.pageBg}>
      <div
        style={{
          position: 'absolute',
          bottom: '20vh',
          left: 0,
        }}
      >
        <div />
      </div>
      <animated.div style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        left: 0,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}
      >
        <LowerThird cgConfig={cgConfig} />
        <EventBranding cgConfig={cgConfig} />
        <QualRankings cgConfig={cgConfig} />
      </animated.div>
    </StyledOverlay>
  );
}
