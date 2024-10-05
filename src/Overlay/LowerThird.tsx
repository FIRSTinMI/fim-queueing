import { h } from 'preact';
import { animated, useSpring } from '@react-spring/web';
import { useEffect, useState } from 'preact/hooks';
import styled from 'styled-components';
import { CGConfig } from '@/types';

const LowerThirdContainer = styled(animated.div)<{ showTicker: boolean, textColor: string }>`
  z-index: 10;
  display: inline-block;
  width: 100%;
  padding: 0.15em;
  box-sizing: border-box;
  background: #fff;
  color: #000;
  
  padding-left: 2em;
  padding-right: 2em;
  padding-top: 0.6em;
  padding-bottom: 0.6em;
  transition-property: padding-left, padding-right, padding-top, padding-bottom;
  transition-duration: 0.3s;
  transition-timing-function: ease-in-out;
  --webkit-clip-path: polygon(0 0, 100% 0, calc(100% - 1.2em) 100%, 0 100%);
  clip-path: polygon(0 0, 100% 0, calc(100% - 1.2em) 100%, 0 100%);
`;

const SubtitleContainer = styled(animated.div)`
  width: fit-content;
  background: #000;
  color: #fff;
  padding: 0.5em 1em 0.5em 2em;
  margin-right: 1.5em;
  display: inline-block;
  div {
    font-size: 0.7em;
  }
`;

type LowerThirdInfo = {
  logo: string | null;
  title: string | null;
  subtitle: string | null;
};

function LowerThird({
  cgConfig,
}: { cgConfig: CGConfig }) {
  const [shouldShow, setShouldShow] = useState<boolean>(false);
  const [displayedInfo, setDisplayedInfo] = useState<LowerThirdInfo | undefined>(undefined);
  const [spring, springApi] = useSpring(() => ({
    from: {
      x: '-100%',
      subtitleY: '-101%',
      borderWidth: '0em',
    },
  }));

  const animateOut = async () => {
    await Promise.all(springApi.start({
      x: '-100%',
      subtitleY: '-101%',
      borderWidth: '0em',
      config: { tension: 50, friction: 14, clamp: true },
    }));
  };

  const animateIn = async () => {
    const anim1 = springApi.start({
      x: '0%',
      // borderImage: 'linear-gradient(to bottom, #000 50%, transparent 50%) 100% 1',
      config: { tension: 50, friction: 14, clamp: true },
    });
    await new Promise((res) => { setTimeout(res, 800); });
    let anim3 = [] as any[];
    if (cgConfig?.lowerThirdSubtitle) {
      anim3 = springApi.start({
        subtitleY: '0%',
        config: { tension: 50, friction: 14, clamp: true },
      });
      await new Promise((res) => { setTimeout(res, 200); });
    }
    const anim2 = springApi.start({
      borderWidth: '0.5em',
      config: { tension: 120, friction: 14, clamp: true },
    });
    await Promise.all([...anim1, ...anim2, ...anim3]);
  };

  // Decide whether the branding should *actually* be shown
  useEffect(() => {
    setShouldShow(
      !!displayedInfo
      && cgConfig.showLowerThird
      && (
        (!!displayedInfo.title && !!displayedInfo.title.match(/\S/)) 
        || (!!displayedInfo.subtitle && !!displayedInfo.subtitle.match(/\S/))
      )
    );
  }, [
    cgConfig?.showLowerThird,
    displayedInfo?.title,
    displayedInfo?.subtitle,
  ]);

  // Handle in/out animations
  useEffect(() => {
    if (!shouldShow) {
      animateOut();
    } else {
      animateIn();
    }
  }, [shouldShow]);

  // Animate out before updating the displayed branding
  useEffect(() => {
    const updateInfo = () => {
      setDisplayedInfo({
        logo: cgConfig.lowerThirdLogo,
        title: cgConfig.lowerThirdTitle,
        subtitle: cgConfig.lowerThirdSubtitle,
      });
    };
    if (!shouldShow) {
      updateInfo();
      return;
    }
    (async () => {
      await animateOut();
      updateInfo();
      await new Promise((res) => { setTimeout(res, 100); });
      await animateIn();
    })();
  }, [
    cgConfig.lowerThirdLogo, cgConfig.lowerThirdTitle, cgConfig.lowerThirdSubtitle,
  ]);

  if (!displayedInfo) return null;
  return (
    <animated.div style={{
      paddingBottom: '2em', x: spring.x, display: 'flex', flexDirection: 'column-reverse',
    }}
    >
      {/*
        Subtitle needs to go before title in the DOM tree so that layering works properly.
        Otherwise, the subtitle displays on top of the title
      */}
      {displayedInfo.subtitle && (
        <SubtitleContainer style={{ y: spring.subtitleY }}>
          <div>{displayedInfo.subtitle}</div>
        </SubtitleContainer>
      )}
      <animated.div style={{ filter: spring.borderWidth.to((val) => `drop-shadow(${val} 0px 0px #0066b3)`), zIndex: 30 }}>
        <LowerThirdContainer>
          {displayedInfo.title}
        </LowerThirdContainer>
      </animated.div>
    </animated.div>
  );
}

export default LowerThird;
