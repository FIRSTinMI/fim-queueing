import { h, Fragment } from 'preact';
import {
  DatabaseReference, getDatabase, ref, onValue, off,
} from 'firebase/database';
import {
  useContext, useEffect, useState, useRef,
} from 'preact/hooks';
import Color from 'color';

import { EventState } from '@shared/DbTypes';
import { TeamRanking } from '@/types';
import AppContext from '@/AppContext';
import styles from './styles.scss';
import Ranking from '../../Tickers/Ranking';
import RankingList from '../../Tickers/RankingList';
import MenuBar from '../../MenuBar';

const KeyableTicker = () => {
  const { event, season, token } = useContext(AppContext);
  if (event === undefined || season === undefined) throw new Error('App context has undefineds');
  const dbEventRef = useRef<DatabaseReference>();

  const [showTicker, setShowTicker] = useState(false);
  const [forceBottom, setForceBottom] = useState(true);
  const [bgColor, setBgColor] = useState('#FF00FF');
  const [tickerColor, setTickerColor] = useState('#0c0e15');
  const [textMode, setTextMode] = useState<'light' | 'dark'>('light');
  const [rankings, setRankings] = useState<TeamRanking[]>([]);
  const [showAsOf, setShowAsOf] = useState<boolean>(true);
  const [asOf, setAsOf] = useState<string>('');
  const [customBrandingText, setCustomBrandingText] = useState<string>('');
  const [customBrandingImgUrl, setCustomBrandingImgUrl] = useState<string>('');
  const urlParamsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Load settings from URL
    const url = new URL(window.location.href);
    const forceBottomParam = url.searchParams.get('forceBottom');
    if (forceBottomParam !== null) setForceBottom(forceBottomParam === 'true');

    const bgColorParam = url.searchParams.get('bgColor');
    if (bgColorParam !== null) setBgColor(bgColorParam);

    const tickerColorParam = url.searchParams.get('tickerColor');
    if (tickerColorParam !== null) setTickerColor(tickerColorParam);

    const showAsOfParam = url.searchParams.get('showAsOf');
    if (showAsOfParam !== null) setShowAsOf(showAsOfParam === 'true');

    const customBrandingTextParam = url.searchParams.get('customBrandingText');
    if (customBrandingTextParam !== null) setCustomBrandingText(customBrandingTextParam);

    const customBrandingImgUrlParam = url.searchParams.get('customBrandingImgUrl');
    if (customBrandingImgUrlParam !== null) setCustomBrandingImgUrl(customBrandingImgUrlParam);
  }, []);

  useEffect(() => {
    if (!token) return;
    dbEventRef.current = ref(getDatabase(), `/seasons/${season}/events/${token}`);
  }, [event.eventCode, season, token]);

  // Update URL with settings when they change (2 seconds after last change to prevent chaos when
  // dragging the color sliders)
  useEffect(() => {
    if (urlParamsTimeoutRef.current) clearTimeout(urlParamsTimeoutRef.current);
    urlParamsTimeoutRef.current = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set('forceBottom', forceBottom.toString());
      url.searchParams.set('bgColor', bgColor);
      url.searchParams.set('tickerColor', tickerColor);
      url.searchParams.set('showAsOf', showAsOf.toString());
      url.searchParams.set('customBrandingText', customBrandingText);
      url.searchParams.set('customBrandingImgUrl', customBrandingImgUrl ?? '');
      window.history.replaceState({}, '', url.toString());
    }, 2000);
  }, [tickerColor, bgColor, forceBottom, showAsOf, customBrandingImgUrl, customBrandingText]);

  useEffect(() => {
    if (!(['QualsInProgress', 'AwaitingAlliances'] as EventState[]).includes(event.state)) {
      setShowTicker(false);
    } else if (!rankings || rankings.length === 0) {
      setShowTicker(false);
    } else {
      setShowTicker(true);
    }
  }, [rankings, event.state]);

  useEffect(() => {
    if (!showAsOf || !event.lastModifiedMs) {
      setAsOf('');
      return;
    }
    if (event.lastModifiedMs < Date.now() - 24 * 60 * 60 * 1000) {
      setAsOf('a long time ago');
      return;
    }

    setAsOf(new Date(event.lastModifiedMs).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'shortGeneric' }));
  }, [event.lastModifiedMs, showAsOf]);

  useEffect(() => {
    setTextMode(Color(tickerColor).isDark() ? 'light' : 'dark');
  }, [tickerColor]);

  const menuOptions = () => (
    <>
      <div className={styles.flex}>
        {/* Select Ticker Position */}
        <div className={styles.child}>
          <label htmlFor="forceBottom">
            Force Bottom:
            {/* @ts-ignore */}
            <input type="checkbox" checked={forceBottom} onInput={(e): void => setForceBottom(e.target.checked)} id="forceBottom" />
          </label>
        </div>

        {/* Select Ticker Position */}
        <div className={styles.child}>
          <label htmlFor="showAsOf">
            Show &quot;As of&quot;:
            {/* @ts-ignore */}
            <input type="checkbox" checked={showAsOf} onInput={(e): void => setShowAsOf(e.target.checked)} id="showAsOf" />
          </label>
        </div>

      </div>

      <div className={styles.flex}>
        {/* Select Key Color */}
        <div className={styles.child}>
          <label htmlFor="bgColorSelect" style={{ display: 'grid' }}>
            Key Color
            {/* @ts-ignore */}
            <input type="color" value={bgColor} onInput={(e): void => setBgColor(e.target.value)} id="bgColorSelect" />
            <div className={styles.colorBtnContainer}>
              <button type="button" onClick={() => setBgColor('#ff00ff')}>Magenta</button>
              <button type="button" onClick={() => setBgColor('#00ff00')}>Green</button>
            </div>
          </label>
        </div>

        {/* Select Ticker BG Color */}
        <div className={styles.child}>
          <label htmlFor="tickerBgColorSelect" style={{ display: 'grid' }}>
            Ticker BG Color
            {/* @ts-ignore */}
            <input type="color" value={tickerColor} onInput={(e): void => setTickerColor(e.target.value)} id="tickerBgColorSelect" />
            <div className={styles.colorBtnContainer}>
              <button type="button" onClick={() => setTickerColor('#0c0e15')}>Reset</button>
            </div>
          </label>
        </div>
      </div>

      <div className={styles.flex}>
        {/* Custom Branding Name */}
        <div className={styles.child}>
          <label htmlFor="brandingName">
            Custom Branding (Leave blank to disable)
            {/* @ts-ignore */}
            <input type="text" value={customBrandingText} onInput={(e): void => setCustomBrandingText(e.target.value)} id="brandingName" />
          </label>
        </div>

        {/* Custom Branding URL */}
        <div className={styles.child}>
          <label htmlFor="brandingImg">
            Custom Branding Image (Leave blank to disable)
            {/* @ts-ignore */}
            <input type="text" value={customBrandingImgUrl} onInput={(e): void => setCustomBrandingImgUrl(e.target.value)} id="brandingImg" />
          </label>
        </div>
      </div>
    </>
  );

  useEffect(() => {
    const rankingsRef = ref(getDatabase(), `/seasons/${season}/rankings/${token}`);
    onValue(rankingsRef, (snap) => {
      setRankings((snap.val() as TeamRanking[])?.sort((a, b) => a.rank - b.rank) ?? []);
    });
    return () => { off(rankingsRef); };
  }, []);

  return (
    <>
      <MenuBar event={event} season={season} options={menuOptions()} />
      {/* Give this div a custom ID so that it can be re-styled in applications like OBS */}
      <div id="chroma-background" className={[styles.chromaContainer, textMode === 'light' ? styles.textLight : styles.textDark].join(' ')} style={{ background: bgColor }}>
        <div className={[styles.tickerBox, (forceBottom ? styles.staticBottom : styles.staticTop)].join(' ')}>
          {showTicker && (
            <RankingList customBgColor={tickerColor}>
              {rankings.map((x) => (
                <Ranking
                  teamNumber={x.teamNumber}
                  ranking={x.rank}
                  customTextColor={textMode === 'light' ? '#fff' : '#000'}
                  customAccentColor={textMode === 'light' ? '#ccc' : '#333'}
                />
              ))}
            </RankingList>
          )}
          <div className={styles.tickerAddons}>
            {customBrandingText !== ''
              ? (
                <div className={styles.branding} style={{ backgroundColor: tickerColor }}>
                  {customBrandingImgUrl !== '' && <img src={customBrandingImgUrl} alt="custom branding logo" /> }
                  {customBrandingText}
                </div>
              )
              : (
                <div>
                  {/* Display an empty div so that the flex property functions properly */}
                </div>
              )}
            {asOf !== '' && showTicker
              && (
                <div className={styles.asOf} style={{ backgroundColor: tickerColor }}>
                  As of {asOf}
                </div>
              )}
          </div>
        </div>
      </div>
    </>
  );
};

export default KeyableTicker;
