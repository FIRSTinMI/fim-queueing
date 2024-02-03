import { h, Fragment } from 'preact';
import { route } from 'preact-router';
import { getAuth } from 'firebase/auth';
import styled from 'styled-components';
import {
  useContext, useEffect, useMemo, useRef, useState,
} from 'preact/hooks';
import {
  ref, getDatabase, onValue, DatabaseReference, set,
} from 'firebase/database';
import AppContext from '@/AppContext';
import { CGConfig } from '@/types';
import ErrorMessage from '../ErrorMessage';

const OptionsPage = styled.div`
  font-size: 18px;

  main {
    display: flex;
    width: 90%;
    margin: 0 5%;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.5em;
  }

  footer {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;

    margin-top: 2em;
    padding-bottom: calc(env(safe-area-inset-bottom) + 0.5em);

    display: flex;
    justify-content: center;

    button {
      min-width: calc(500px * 2 + 0.5em);
      max-width: 100%;
      background-color: #129d12;
      border: 0.1rem solid #129d12;

      &:focus {
        box-shadow: 0px 0px 0px 3px #007700
      }
    }
  }
`;

const StyledHeader = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0 0.5em;

  .buttons {
    display: flex;
    gap: 0.5em;
    justify-content: flex-end;
    button {
      display: inline;
      /* width: 100%; */
      margin-block: .5em;
      padding: 0em .4em;

      img {
        height: 100%;
      }

      &:hover img {
        filter: grayscale(1);
      }
    }
  }
`;

const OptionsBox = styled.section`
  border: 1px solid #555;
  border-radius: 5px;
  flex-basis: 500px;
  padding: 0.5em;

  h2 {
    font-size: 1.2em;
  }

  label {
    font-weight: 400;
    font-size: 1em;
  }

  input {
    height: unset;
  }
`;

const HidableSpan = styled.span<{ isShown: boolean }>`
  filter: blur(${(props) => (props.isShown ? '0px' : '0.25em')})
`;

const Note = styled.span`
  font-style: italic;
  font-size: 0.8em;
  
  &:before {
    content: '\\2014' // em-dash
  }
`;

const Options = () => {
  const email = useMemo(() => getAuth().currentUser?.email, undefined);
  const { event, season, token } = useContext(AppContext);

  const [error, setError] = useState<string>('');
  const [isKeyShown, setIsKeyShown] = useState<boolean>(false);

  const [pageBg, setPageBg] = useState<string>('');

  const [syncColors, setSyncColors] = useState<boolean>(true);

  const [showBranding, setShowBranding] = useState<boolean>(false);
  const [brandingBg, setBrandingBg] = useState<string>('#000');
  const [brandingTextColor, setBrandingTextColor] = useState<string>('#fff');
  const [brandingImage, setBrandingImage] = useState<string | null>(null);
  const [brandingText, setBrandingText] = useState<string | null>(null);

  const [showTicker, setShowTicker] = useState<boolean>(false);
  const [tickerBg, setTickerBg] = useState<string>('#000');
  const [tickerTextColor, setTickerTextColor] = useState<string>('#fff');

  const [showLowerThird, setShowLowerThird] = useState<boolean>(false);
  const [lowerThirdTitle, setLowerThirdTitle] = useState<string | null>(null);
  const [lowerThirdSubtitle, setLowerThirdSubtitle] = useState<string | null>(null);

  const cgConfigDbRef = useRef<DatabaseReference>();

  useEffect(() => {
    cgConfigDbRef.current = ref(getDatabase(), `/seasons/${season}/cg/${token}`);
    onValue(cgConfigDbRef.current, (snap) => {
      const val = snap.val() as CGConfig;
      setPageBg(val.pageBg);
      setShowBranding(val.showBranding);
      setShowTicker(val.showTicker);
      setSyncColors(
        val.tickerBg === val.brandingBg && val.tickerTextColor === val.brandingTextColor,
      );
      setTickerBg(val.tickerBg);
      setBrandingBg(val.brandingBg);
      setTickerTextColor(val.tickerTextColor);
      setBrandingTextColor(val.brandingTextColor);
      setBrandingImage(val.brandingImage);
      setBrandingText(val.brandingText);
      setShowLowerThird(val.showLowerThird);
      setLowerThirdTitle(val.lowerThirdTitle);
      setLowerThirdSubtitle(val.lowerThirdSubtitle);
    });
  }, []);

  useEffect(() => {
    if (syncColors) {
      setTickerBg(brandingBg);
      setTickerTextColor(brandingTextColor);
    }
  }, [syncColors, brandingBg, brandingTextColor]);

  const take = async () => {
    setError('');
    try {
      if (cgConfigDbRef.current === undefined) {
        throw new Error('DB Reference not defined');
      }
      await set(cgConfigDbRef.current, {
        pageBg: pageBg ?? null,
        showBranding: showBranding ?? null,
        showTicker: showTicker ?? null,
        brandingBg: brandingBg ?? null,
        brandingTextColor: brandingTextColor ?? null,
        tickerBg: tickerBg ?? null,
        tickerTextColor: tickerTextColor ?? null,
        brandingImage: brandingImage ?? null,
        brandingText: brandingText ?? null,
        showLowerThird: showLowerThird ?? null,
        lowerThirdTitle: lowerThirdTitle ?? null,
        lowerThirdSubtitle: lowerThirdSubtitle ?? null,
      } as CGConfig);
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      }
    }
  };

  const onClickLogout = async () => {
    await getAuth().signOut();
    route('/login');
  };

  return (
    <OptionsPage>
      <StyledHeader>
        <p>{event?.name} ({season})</p>
        <div>
          <span>{email}</span>
          <div className="buttons">
            <button
              type="button"
              onClick={(): boolean => route(`/${window?.location?.hash ?? ''}`, false)}
            >
              Home
            </button>
            <button type="button" onClick={onClickLogout}>Sign out</button>
          </div>
        </div>
      </StyledHeader>
      {error && <ErrorMessage type="error">{error}</ErrorMessage>}
      <main>
        <OptionsBox>
          <h2>Setup</h2>
          <p>
            To get the overlay into vMix, create a new web input with the following URL,
            then set it as an overlay with a lower number than Audience Display:
          </p>
          <span>
            {window.location.origin}/overlay?key=
            <HidableSpan isShown={isKeyShown}>{token}</HidableSpan>
          </span>
          <div><button type="button" onClick={() => setIsKeyShown(!isKeyShown)}>{isKeyShown ? 'Hide' : 'Show'} Key</button></div>

          <p>
            Note: At this time, the Overlay is only designed to work when the real-time scoring
            in Audience Display is set to be at the top of the screen.
          </p>
        </OptionsBox>
        <OptionsBox>
          <h2>Colors</h2>
          <label htmlFor="pageBg">
            Page Background <Note>Leaving this blank is recommended</Note>
            <input id="pageBg" onChange={(e) => setPageBg((e.target as HTMLInputElement).value)} value={pageBg} type="text" />
          </label>
          <label htmlFor="syncColors">
            <input id="syncColors" onChange={() => setSyncColors(!syncColors)} checked={syncColors} type="checkbox" />
            Sync Branding and Ticker colors?
          </label>
          <label htmlFor="brandingBg">
            Branding Background <Note>Coordinate any sponsor branding with @av-staff</Note>
            <input id="brandingBg" onChange={(e) => setBrandingBg((e.target as HTMLInputElement).value)} value={brandingBg} type="text" />
          </label>
          <label htmlFor="brandingTextColor">
            Branding Text Color
            <input id="brandingTextColor" onChange={(e) => setBrandingTextColor((e.target as HTMLInputElement).value)} value={brandingTextColor} type="text" />
          </label>
          {!syncColors && (
            <>
              <label htmlFor="tickerBg">
                Ticker Background
                <input id="tickerBg" onChange={(e) => setTickerBg((e.target as HTMLInputElement).value)} value={tickerBg} type="text" />
              </label>
              <label htmlFor="tickerTextColor">
                Ticker Text Color
                <input id="tickerTextColor" onChange={(e) => setTickerTextColor((e.target as HTMLInputElement).value)} value={tickerTextColor} type="text" />
              </label>
            </>
          )}
        </OptionsBox>
        <OptionsBox>
          <h2>Branding</h2>
          <label htmlFor="showBranding">
            <input id="showBranding" onChange={() => setShowBranding(!showBranding)} checked={showBranding} type="checkbox" />
            Show Branding
          </label>
          <label htmlFor="brandingText">
            Branding Text
            <input id="brandingText" onChange={(e) => setBrandingText((e.target as HTMLInputElement).value)} value={brandingText ?? undefined} type="text" />
          </label>
          <label htmlFor="brandingImage">
            Branding Image URL <Note>Branding images should be created by @av-staff</Note>
            <input id="brandingImage" onChange={(e) => setBrandingImage((e.target as HTMLInputElement).value)} value={brandingImage ?? undefined} type="text" />
          </label>
        </OptionsBox>
        <OptionsBox>
          <h2>Ticker</h2>
          <label htmlFor="showTicker">
            <input id="showTicker" onChange={() => setShowTicker(!showTicker)} checked={showTicker} type="checkbox" />
            Show Rankings Ticker
          </label>
          <em>
            Rankings ticker only shown during qualification matches and while waiting
            for alliances to be chosen.
          </em>
        </OptionsBox>
        <OptionsBox>
          <h2>Lower Third</h2>
          <p>
            <em>
              This functionality can be used to introduce speakers or to display a message
              to the audience (such as: Matches begin at 1:00 PM)
            </em>
          </p>
          <label htmlFor="showLowerThird">
            <input id="showLowerThird" onChange={() => setShowLowerThird(!showLowerThird)} checked={showLowerThird} type="checkbox" />
            Show Lower Third
          </label>
          <label htmlFor="lowerThirdTitle">
            Title
            <input id="lowerThirdTitle" onChange={(e) => setLowerThirdTitle((e.target as HTMLInputElement).value)} value={lowerThirdTitle ?? undefined} type="text" />
          </label>
          <label htmlFor="lowerThirdSubtitle">
            Subtitle
            <input id="lowerThirdSubtitle" onChange={(e) => setLowerThirdSubtitle((e.target as HTMLInputElement).value)} value={lowerThirdSubtitle ?? undefined} type="text" />
          </label>
        </OptionsBox>
      </main>
      <footer>
        <button onClick={take} type="submit">Apply</button>
      </footer>
    </OptionsPage>
  );
};

export default Options;
