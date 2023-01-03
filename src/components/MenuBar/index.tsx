import { h, Fragment } from 'preact';
import { route } from 'preact-router';
import Cookies from 'js-cookie';
import { Event } from '../../types';
import styles from './styles.scss';
import { useEffect, useState } from 'preact/hooks';

type MenuBarProps = {
  event: Event,
  season: number,
  alwaysShow: boolean,
  options: JSX.Element
};

function onLogout(): void {
  // eslint-disable-next-line no-alert --  I don't care enough to implement a real modal
  if (!window.confirm('Are you sure you want to log out?')) return;
  Cookies.remove('queueing-event-key');
  window.location.reload();
}

const MenuBar = (props: MenuBarProps) => {
  const { event, season, alwaysShow, options } = props;

  const [showMenu, setShowMenu] = useState(false);

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

  if (!alwaysShow) {
    useEffect(() => {
      document.addEventListener("mousemove", handleMouseMove);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
      }
    }, []);
  }

  if (event === undefined || season === undefined) return (<></>);
  return (
    <div className={[styles.menu, showMenu ? '' : styles.hidden, alwaysShow ? styles.alwaysShow : ''].join(' ')}>
          <div className={styles.eventName}>
            {event.name}
            {' '}
            ({season})
          </div>
          <div className={styles.actions}>
            <div>
              {options}
            </div>
            <div className={styles.buttons}>
              <button type="button" onClick={(): boolean => route('/', false)}>Back to home</button>
              <button type="button" onClick={(): void => onLogout()}>Log out</button>
            </div>
          </div>
        </div>
  );
};

MenuBar.defaultProps = {
  options: (<></>),
  alwaysShow: false
}

export default MenuBar;
