import { h } from 'preact';
import { get, getDatabase, ref } from 'firebase/database';
import Cookies from 'js-cookie';
import { useContext, useEffect, useState } from 'preact/hooks';
import styled from 'styled-components';

import AppContext from '../AppContext';
import Disclaimer from './shared/Disclaimer';

type LoginFormProps = {
  onLogin: (token: string, supaToken: string) => void;
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
  const [errorText, setErrorText] = useState<string | null>(null);
  
  const handleSuccessfulLogin = (supaToken: string): void => {
    const expFromToken = new Date(JSON.parse(atob(supaToken.split('.')[1]))['exp'] * 1_000);
    console.log("about to set cookie exp", expFromToken, "token", supaToken, JSON.parse(atob(supaToken.split('.')[1])));
    Cookies.set('queueing-event-key', eventToken, {
      expires: expFromToken,
    });
    Cookies.set('queueing-supa-token', supaToken, {
      expires: expFromToken
    });
    onLogin(eventToken, supaToken);
  };

  const handleFailedLogin = (): void => {
    setBadToken(true);
  };

  const handleSubmit = async (e: Event): Promise<void> => {
    e.preventDefault();
    if (!eventToken || eventToken === '') handleFailedLogin();
    setErrorText(null);

    try {
      const loginResponse = await fetch(import.meta.env.APP_ADMIN_SERVER + '/av-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventKey: eventToken
        })
      });
      
      const loginResponseJson = await loginResponse.json();
      
      if (!loginResponse.ok) {
        handleFailedLogin();
        setErrorText(
          loginResponseJson["detail"]
          ?? "An error occurred while logging in. Your key may be incorrect or inactive.");
      }
      
      const token = loginResponseJson["accessToken"];
      
      handleSuccessfulLogin(token);
    } catch (err) {
      handleFailedLogin();
      console.error(err);
    }
  };
  
  useEffect(() => {
    const token = Cookies.get('queueing-event-key');
    const supa = Cookies.get('queueing-supa-token');
    if (token && supa) {
      onLogin(token, supa);
    }
  }, []);

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
