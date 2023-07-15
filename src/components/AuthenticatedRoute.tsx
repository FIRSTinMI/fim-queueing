import { h } from 'preact';
import { Route, RouteProps, route } from 'preact-router';
import { useEffect } from 'preact/hooks';
import { getAuth } from 'firebase/auth';

export default function AuthenticatedRoute<T>(props: RouteProps<T> & Partial<T>) {
  const isLoggedIn = getAuth().currentUser != null;

  // only redirect once we've cleared the screen:
  useEffect(() => {
    if (!isLoggedIn) {
      route(`/login?redirect=${encodeURIComponent(window.location.pathname)}`, true);
    }
  }, [isLoggedIn]);

  // not logged in, render nothing:
  if (!isLoggedIn) return null;

  // eslint-disable-next-line react/jsx-props-no-spreading
  return <Route {...props} />;
}
