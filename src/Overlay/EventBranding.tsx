import { h } from 'preact';
import { animated, useSpring } from '@react-spring/web';
import { useEffect, useState } from 'preact/hooks';
import styled from 'styled-components';
import { CGConfig } from '@/types';

const Branding = styled(animated.div)<{ showTicker: boolean, background: string, textColor: string }>`
  z-index: 0;
  display: inline-block;
  padding: 0.15em;
  box-sizing: border-box;
  /* font-size: 0.65em; */
  background: ${(props) => props.background};
  background-attachment: fixed;
  margin-bottom: -1em;
  border-bottom-width: 1em;
  border-bottom-style: solid;
  border-bottom-color: ${(props) => props.background};
  color: ${(props) => props.textColor};
  padding-left: ${(props) => (props.showTicker ? '2em' : '2em')};
  padding-right: ${(props) => (props.showTicker ? '2em' : '2em')};
  padding-top: ${(props) => (props.showTicker ? null : '0.6em')};
  padding-bottom: ${(props) => (props.showTicker ? null : '0.6em')};
  transition-property: padding-left, padding-right, padding-top, padding-bottom;
  transition-duration: 0.3s;
  transition-timing-function: ease-in-out;
  /* border-left-width: 0em; */
  /* border-left-style: solid; */
  -webkit-clip-path: polygon(0 0, calc(100% - 1.2em) 0, 100% 100%, 0 100%);
  clip-path: polygon(0 0, calc(100% - 1.2em) 0, 100% 100%, 0 100%);
`;

const BrandingImage = styled.img`
  display: block;
  margin: 0 auto;
  max-height: 1.5em;
  min-height: 1.5em;
  padding-top: 0.2em;
  padding-bottom: 0.2em;
  padding-right: .1em;
`;

type BrandingInfo = {
  brandingText: string | null;
  brandingImage: string | null;
  backgroundColor: string;
  textColor: string;
  showTicker: boolean;
};

function EventBranding({
  cgConfig,
}: { cgConfig: CGConfig }) {
  const [shouldShowBranding, setShouldShowBranding] = useState<boolean>(false);
  const [
    displayedBrandingInfo, setDisplayedBrandingInfo,
  ] = useState<BrandingInfo | undefined>(undefined);
  const [brandingSpring, brandingSpringApi] = useSpring(() => ({
    from: {
      x: '-100%',
      // borderLeftWidth: '0em',
    },
  }));

  const animateBrandingOut = async () => {
    await Promise.all(brandingSpringApi.start({
      x: '-100%',
      // borderLeftWidth: '0em',
      config: { tension: 50, friction: 14, clamp: true },
    }));
  };

  const animateBrandingIn = async () => {
    const anim1 = brandingSpringApi.start({
      x: '0%',
      config: { tension: 50, friction: 14, clamp: true },
    });
    // await new Promise((res) => { setTimeout(res, 400); });
    // const anim2 = brandingSpringApi.start({
    //   borderLeftWidth: '0.5em',
    //   config: { tension: 120, friction: 14, clamp: true },
    // });
    await Promise.all([...anim1]);
  };

  // Decide whether the branding should *actually* be shown
  useEffect(() => {
    setShouldShowBranding(!!displayedBrandingInfo && cgConfig.showBranding
      && (!!displayedBrandingInfo.brandingText || !!displayedBrandingInfo.brandingImage));
  }, [
    cgConfig?.showBranding,
    displayedBrandingInfo?.brandingImage,
    displayedBrandingInfo?.brandingText,
  ]);

  // Handle in/out animations
  useEffect(() => {
    if (!shouldShowBranding) {
      animateBrandingOut();
    } else {
      animateBrandingIn();
    }
  }, [shouldShowBranding]);

  // Animate out before updating the displayed branding
  useEffect(() => {
    const updateInfo = () => {
      setDisplayedBrandingInfo({
        brandingText: cgConfig.brandingText,
        brandingImage: cgConfig.brandingImage,
        backgroundColor: cgConfig?.brandingBg ?? '#000',
        textColor: cgConfig?.brandingTextColor ?? '#fff',
        showTicker: cgConfig?.showTicker ?? true,
      });
    };
    if (!shouldShowBranding) {
      updateInfo();
      return;
    }
    (async () => {
      await animateBrandingOut();
      updateInfo();
      await new Promise((res) => { setTimeout(res, 100); });
      await animateBrandingIn();
    })();
  }, [
    cgConfig.brandingText, cgConfig.brandingImage, cgConfig.brandingBg,
    cgConfig.brandingTextColor,
  ]);

  if (!displayedBrandingInfo) return null;
  return (
    <Branding
      style={brandingSpring}
      showTicker={cgConfig.showTicker}
      background={displayedBrandingInfo.backgroundColor}
      textColor={displayedBrandingInfo.textColor}
    >
      {displayedBrandingInfo?.brandingImage && <BrandingImage src={displayedBrandingInfo.brandingImage} alt="Branding Logo" />}
      {displayedBrandingInfo?.brandingText}
    </Branding>
  );
}

export default EventBranding;
