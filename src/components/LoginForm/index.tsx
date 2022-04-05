import { get, getDatabase, ref } from 'firebase/database';
import Cookies from 'js-cookie';
import { Component, h } from 'preact';

import styles from './styles.scss';

type LoginFormProps = {
  onLogin: (token: string, season: number) => void;
  season: number;
};

type LoginFormState = {
  eventToken: string;
  badToken: boolean;
};

export default class LoginForm extends Component<LoginFormProps, LoginFormState> {
  constructor(props: LoginFormProps) {
    super(props);
    this.state = {
      eventToken: '',
      badToken: false,
    };
  }

  // @ts-ignore
  async handleSubmit(e): Promise<void> {
    const { eventToken } = this.state;
    const { season } = this.props;

    e.preventDefault();
    if (!eventToken || eventToken === '') this.handleFailedLogin();

    try {
      const event = await get(ref(getDatabase(), `/seasons/${season}/events/${eventToken}`));
      if (!event) {
        this.handleFailedLogin();
        return;
      }

      const now = new Date();
      const start = new Date(event.child('start').val().replace(' ', 'T'));
      const end = new Date(event.child('end').val().replace(' ', 'T'));

      if (start > now || end < now) {
        this.handleFailedLogin();
        return;
      }

      this.handleSuccessfulLogin(end);
    } catch (err) {
      this.handleFailedLogin();
      console.error(err);
    }
  }

  handleSuccessfulLogin(expiration: Date): void {
    const { eventToken } = this.state;
    const { onLogin, season } = this.props;

    Cookies.set('queueing-event-key', eventToken, {
      expires: expiration,
    });
    onLogin(eventToken, season);
  }

  handleFailedLogin(): void {
    this.setState({
      badToken: true,
    });
  }

  render(): JSX.Element {
    const { badToken } = this.state;

    return (
      <div>
        {/* @ts-ignore */}
        <form onSubmit={(e): void => { this.handleSubmit(e); }} className={styles.loginForm}>
          <div>Enter your 10-character event key:</div>
          <input type="password" maxLength={10} minLength={10} onInput={(e): void => this.setState({ eventToken: (e.target as HTMLInputElement).value })} />
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
  }
}
