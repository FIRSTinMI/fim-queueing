import { get, getDatabase, ref } from 'firebase/database';
import Cookies from 'js-cookie';
import { Component, h } from 'preact';

import styles from './loginForm.scss';

type LoginFormProps = { 
    onLogin: (token: string) => void;
}

export default class LoginForm extends Component<LoginFormProps, { eventToken: string; badToken: boolean }> {
    constructor(props: LoginFormProps) {
        super(props);
        this.state = {
            eventToken: '',
            badToken: false
        }
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    async handleSubmit(e): Promise<void> {
        e.preventDefault();
        if (!this.state.eventToken || this.state.eventToken === '') this.handleFailedLogin();

        try {
            const event = await get(ref(getDatabase(), `events/2022/${this.state.eventToken}`));
            if (!event) {
                this.handleFailedLogin();
                return;
            }

            const now = new Date();
            const start = new Date(event.child('start').val());
            const end = new Date(event.child('end').val());

            if (start > now || end < now) {
                this.handleFailedLogin();
                return;
            }

            this.handleSuccessfulLogin(end);
        } catch(e) {
            this.handleFailedLogin();
            console.error(e);
        }
    }

    handleSuccessfulLogin(expiration: Date): void {
        Cookies.set("queueing-event-key", this.state.eventToken, {
            expires: expiration
        });
        this.props.onLogin(this.state.eventToken);
    }

    handleFailedLogin(): void {
        this.setState({
            badToken: true
        });
    }

    render(): JSX.Element {
        return (
            <div>
                {/* @ts-ignore */}
                <form onSubmit={(e): void => {this.handleSubmit(e)}} class={styles.loginForm}>
                    <div>Enter your 10-character event key:</div>
                    <input type="password" maxLength={10} minLength={10} onInput={(e): void => this.setState({eventToken: (e.target as HTMLInputElement).value})} />
                    <button type="submit">Log in</button>
                </form>
                { this.state.badToken && <div>Bad event token or event not eligible for queueing</div>}
                <div class={styles.disclaimer}>
                    This system is only for use by A/V volunteers at FIRST in Michigan events.
                    If you have not been given explicit permission to use this system, please don't.
                    You'll ruin it for everyone.
                </div>
            </div>
        )
    }
}