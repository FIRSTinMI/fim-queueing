import { h, Fragment } from 'preact';
import { route } from 'preact-router';
import Cookies from 'js-cookie';
import { useEffect, useState } from 'preact/hooks';

import { Event } from '@shared/DbTypes';
import styles from './styles.scss';
import Fullscreen from '@/assets/fullscreen.svg';
import FullscreenExit from '@/assets/fullscreen_exit.svg';
import Home from '@/assets/home.svg';
import Logout from '@/assets/logout.svg';

type MenuBarProps = {
  event: Event | undefined,
  season: number | undefined,
  alwaysShow?: boolean,
  options?: JSX.Element
};

function onLogout(): void {
  // eslint-disable-next-line no-alert --  I don't care enough to implement a real modal
  if (!window.confirm('Are you sure you want to log out?')) return;
  Cookies.remove('queueing-event-key');
  window.location.reload();
}

function getBrowserFullscreenStatus(): boolean {
  return document.fullscreenElement
  || (document as any).webkitFullscreenElement
  || (document as any).mozFullScreenElement
  || (document as any).webkitIsFullScreen;
}

/**
 * A reusable menu bar component with a dynamic area for options.
 * Always displays on mobile devices, and slides down upon mouse movement for
 * desktop.
 */
const MenuBar = (props: MenuBarProps) => {
  const {
    event, season, alwaysShow, options,
  } = props;

  const [showMenu, setShowMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(getBrowserFullscreenStatus());

  let mouseTimeout: number | undefined;
  const handleMouseMove = () => {
    if (!showMenu) {
      setShowMenu(true);

      clearTimeout(mouseTimeout);
      mouseTimeout = window.setTimeout(() => {
        setShowMenu(false);
      }, 2000);
    }
  };

  // Watch for fullscreenchange
  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(getBrowserFullscreenStatus());
    }

    const prefixes = ['', 'moz', 'webkit', 'ms'];
    prefixes.forEach((pre) => document.addEventListener(`${pre}fullscreenchange`, onFullscreenChange));

    return () => prefixes.forEach((pre) => document.removeEventListener(`${pre}fullscreenchange`, onFullscreenChange));
  }, []);

  if (!alwaysShow) {
    useEffect(() => {
      document.addEventListener('mousemove', handleMouseMove);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
      };
    }, []);
  }

  async function enterFullscreen() {
    try {
      if (document.body.requestFullscreen) {
        await document.body.requestFullscreen();
      } else if ((document.body as any).webkitRequestFullscreen) {
        // Safari
        await (document.body as any).webkitRequestFullscreen();
      } else if ((document.body as any).msRequestFullscreen) { /* IE11 */
        (document.body as any).msRequestFullscreen();
      } else {
        throw new Error('Unknown browser');
      }
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert('Unable to enter fullscreen.');
    }
  }

  async function exitFullscreen() {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        // Safari
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) { /* IE11 */
        (document as any).msExitFullscreen();
      } else {
        throw new Error('Unknown browser');
      }
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert('Unable to exit fullscreen. Press the escape key.');
    }
  }

  if (event === undefined || season === undefined) return (<></>);
  return (
    <div className={[
      styles.menu,
      showMenu ? '' : styles.hidden, alwaysShow ? styles.alwaysShow : '',
    ].join(' ')}
    >
      <div className={styles.eventName}>
        {event.name}
        {' '}
        (
        {season}
        )
      </div>
      <div className={styles.actions}>
        <div>
          {options}
        </div>
        <div className={styles.buttons}>
          {!isFullscreen && (
            <button
              type="button"
              onClick={() => enterFullscreen()}
            >
              {/* <Fullscreen alt="Enter Fullscreen" title="Enter Fullscreen" /> */}
              <img src={Fullscreen} alt="Enter Fullscreen" title="Enter Fullscreen" />
            </button>
          )}
          {isFullscreen && (
            <button
              type="button"
              onClick={() => exitFullscreen()}
            >
              <img src={FullscreenExit} alt="Exit Fullscreen" title="Exit Fullscreen" />
            </button>
          )}
          <button
            type="button"
            onClick={(): boolean => route(`/${window?.location?.hash ?? ''}`, false)}
          >
            <img src={Home} alt="Go Home" title="Go Home" />
          </button>
          <button
            type="button"
            className="button-outline"
            onClick={(): void => onLogout()}
          >
            <img src={Logout} alt="Log Out" title="Log Out" />
          </button>
        </div>
      </div>
    </div>
  );
};

MenuBar.defaultProps = {
  options: (<></>),
  alwaysShow: false,
};

export default MenuBar;
