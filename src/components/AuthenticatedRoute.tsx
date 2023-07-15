import { h, Fragment } from 'preact';
import { Route, RouteProps, route } from 'preact-router';
import { useEffect, useState } from 'preact/hooks';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export default function AuthenticatedRoute<T>(props: RouteProps<T> & Partial<T>) {
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      const auth = getAuth();
      await Promise.race([
        new Promise((res) => setTimeout(res, 5000)),
        new Promise<void>((res) => onAuthStateChanged(auth, () => res())),
      ]);
      const isLoggedIn = auth.currentUser != null;
      if (!isLoggedIn) {
        route(`/login?redirect=${encodeURIComponent(window.location.pathname)}`, true);
      }
      setLoggedIn(isLoggedIn);
    })();
  }, []);

  // not logged in, render nothing:
  if (!loggedIn) return <></>;

  // eslint-disable-next-line react/jsx-props-no-spreading
  return <Route {...props} />;
}
