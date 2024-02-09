import { h } from 'preact';
import { get, getDatabase, ref } from 'firebase/database';
import Cookies from 'js-cookie';
import { useContext, useState } from 'preact/hooks';
import styled from 'styled-components';

import AppContext from '../AppContext';
import Disclaimer from './shared/Disclaimer';

type LoginFormProps = {
  onLogin: (token: string) => void;
};

const StyledLoginForm = styled.form`
  padding: 20px;
  text-align: center;
  input {
    width: 50%;
    min-width: 200px;
    padding: 20px;
    margin-left: 20px;
    margin-right: 20px;
  }
  input[type="password"] {
    font:small-caption;
    font-size:2rem;
  }
`;

const StyledBadCode = styled.div`
  text-align: center;
`;

/**
 * Form displayed to the user when they do not already have an event token.
 */
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
      <StyledLoginForm
        onSubmit={(e: Event): void => { handleSubmit(e); }}
      >
        <div>Enter your 10-character event key:</div>
        <input
          type="password"
          maxLength={10}
          minLength={10}
          onInput={(e): void => setEventToken((e.target as HTMLInputElement).value.toUpperCase())}
        />
        <button type="submit">Log in</button>
      </StyledLoginForm>
      { badToken && (
        <StyledBadCode>Bad event token or event not eligible for queueing</StyledBadCode>
      )}
      <Disclaimer>
        This system is not intended for public use.
        If you have not been given explicit permission to use this system, please don&apos;t.
      </Disclaimer>
    </div>
  );
};

export default LoginForm;
