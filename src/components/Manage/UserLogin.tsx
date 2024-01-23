import { h } from 'preact';
import { useState } from 'preact/hooks';
import { route } from 'preact-router';
import styled from 'styled-components';

import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

import Disclaimer from '../shared/Disclaimer';
import ErrorMessage from '../ErrorMessage';

const UserLoginPage = styled.div``;
const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
`;

const provider = new GoogleAuthProvider();

const UserLogin = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onClickLogin = () => {
    const auth = getAuth();
    setIsLoading(true);
    signInWithPopup(auth, provider).then((res) => {
      console.log(res);
      const redirect = (new URLSearchParams(window.location.search))?.get('redirect') ?? '/manage/options';
      route(redirect);
    }).catch((err) => {
      setErrorMessage(JSON.stringify(err));
    }).finally(() => {
      setIsLoading(false);
    });
  };

  return (
    <UserLoginPage>
      <Disclaimer>
        To manage the event, you need to log in with an authorized account. { ' ' }
        <em>
          Official FiM AV Google accounts are authorized, if you need access from
          your personal account, post a message in #av-private on Slack.
        </em>
      </Disclaimer>

      <ButtonContainer>
        <button type="button" onClick={onClickLogin}>Log in with Google</button>
      </ButtonContainer>

      {isLoading && <Disclaimer>Loading...</Disclaimer>}

      {errorMessage && <ErrorMessage type="error">{errorMessage}</ErrorMessage>}
    </UserLoginPage>
  );
};

export default UserLogin;
