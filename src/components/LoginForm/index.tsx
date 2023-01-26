import { get, getDatabase, ref } from 'firebase/database';
import Cookies from 'js-cookie';
import { h } from 'preact';
import { useContext, useState } from 'preact/hooks';
import AppContext from '../../appContext';

import styles from './styles.scss';

type LoginFormProps = {
  onLogin: (token: string) => void;
};

const LoginForm = ({ onLogin }: LoginFormProps) => {
  const appContext = useContext(AppContext);
  const [eventToken, setEventToken] = useState('');
  const [badToken, setBadToken] = useState(false);

  const handleSuccessfulLogin = (expiration: Date): void => {
    Cookies.set('queueing-event-key', eventToken, {
      expires: expiration,
    });
    onLogin(eventToken);
  };

  const handleFailedLogin = (): void => {
    setBadToken(true);
  };

  const handleSubmit = async (e: Event): Promise<void> => {
    e.preventDefault();
    if (!eventToken || eventToken === '') handleFailedLogin();

    try {
      // TODO: Show error if unable to determine season
      const event = await get(ref(getDatabase(), `/seasons/${appContext.season}/events/${eventToken}`));
      if (!event) {
        handleFailedLogin();
        return;
      }

      const now = new Date();
      const start = new Date(event.child('start').val().replace(' ', 'T'));
      const end = new Date(event.child('end').val().replace(' ', 'T'));

      if (start > now || end < now) {
        handleFailedLogin();
        return;
      }

      handleSuccessfulLogin(end);
    } catch (err) {
      handleFailedLogin();
      console.error(err);
    }
  };

  return (
    <div>
      {/* @ts-ignore */}
      <form onSubmit={(e): void => { handleSubmit(e); }} className={styles.loginForm}>
        <div>Enter your 10-character event key:</div>
        <input type="password" maxLength={10} minLength={10} onInput={(e): void => setEventToken((e.target as HTMLInputElement).value)} />
        <button type="submit">Log in</button>
      </form>
      { badToken && (
        <div className={styles.badCode}>Bad event token or event not eligible for queueing</div>
      )}
      <div className={styles.disclaimer}>
        This system is only for use by A/V volunteers at FIRST in Michigan events.
        If you have not been given explicit permission to use this system, please don&apos;t.
        You&apos;ll ruin it for everyone.
      </div>
    </div>
  );
};

export default LoginForm;
