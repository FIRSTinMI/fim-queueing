import { Component, h } from 'preact';
import Cookies from 'js-cookie';
import {
  child,
  DatabaseReference, getDatabase, off, onValue, ref, update,
} from 'firebase/database';

import {
  Event, AppMode, Match, TeamAvatars,
} from '../../../types';
import MatchDisplay from '../MatchDisplay';
import AnalyticsService from '../../../analyticsService';
import Ranking from '../../Tickers/Ranking';
import RankingList from '../../Tickers/RankingList';
import styles from './styles.scss';

type QueueingProps = {
  event: Event;
  matches?: Match[];
  season: number;
};

type QueueingState = {
  loadingState: 'loading' | 'ready' | 'error' | 'noAutomatic';
  currentMatch: Match | null;
  nextMatch: Match | null;
  queueingMatches: Match[];
  teamAvatars?: TeamAvatars;
  showMenu: boolean;
  rankings: TeamRanking[];
};

type TeamRanking = {
  rank: number;
  teamNumber: number;
};

export default class Queueing extends Component<QueueingProps, QueueingState> {
  private eventRef: DatabaseReference;

  private mouseTimeout?: number;

  private token: string;

  constructor(props: QueueingProps) {
    super(props);
    this.state = {
      loadingState: 'loading',
      currentMatch: null,
      nextMatch: null,
      queueingMatches: [],
      teamAvatars: undefined,
      showMenu: false,
      rankings: [],
    };

    this.token = Cookies.get('queueing-event-key') as string;
    if (!this.token) throw new Error('Token was somehow empty.');

    this.eventRef = ref(getDatabase(), `/seasons/${props.season}/events/${this.token}`);

    // onValue(ref(getDatabase(), `/seasons/${props.season}/avatars`), (snap) => {
    //   this.setState({
    //     teamAvatars: snap.val(),
    //   });
    // });
  }

  componentDidMount(): void {
    if (typeof document === undefined) return;
    document.addEventListener('keydown', this.handleKeyPress.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));

    this.componentDidUpdate({} as QueueingProps);
  }

  componentDidUpdate(prevProps: QueueingProps): void {
    const { event, matches, season } = this.props;

    if (prevProps.event?.currentMatchNumber !== event.currentMatchNumber
            || prevProps.matches !== matches) this.updateMatches();

    if (prevProps.event?.options?.showRankings !== event.options?.showRankings) {
      const rankingsRef = ref(getDatabase(), `/seasons/${season}/rankings/${this.token}`);
      if (event.options?.showRankings) {
        onValue(rankingsRef, (snap) => {
          this.setState({
            rankings: (snap.val() as TeamRanking[]).sort((x) => x.rank),
          });
        });
      } else {
        off(rankingsRef);
      }
    }
  }

  componentWillUnmount(): void {
    if (typeof document === undefined) return;
    document.removeEventListener('keypress', this.handleKeyPress.bind(this));
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
  }

  handleKeyPress(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyA':
        this.swapMode();
        break;
      case 'ArrowLeft':
        this.decrementMatchNumber();
        break;
      case 'ArrowRight':
        this.incrementMatchNumber();
        break;
      default:
        break;
    }
  }

  handleMouseMove(): void {
    const { showMenu } = this.state;
    if (!showMenu) {
      this.setState({
        showMenu: true,
      });

      clearTimeout(this.mouseTimeout);
      this.mouseTimeout = window.setTimeout(() => {
        this.setState({
          showMenu: false,
        });
      }, 2000);
    }
  }

  static onLogout(): void {
    // eslint-disable-next-line no-alert --  I don't care enough to implement a real modal
    if (!window.confirm('Are you sure you want to log out?')) return;
    Cookies.remove('queueing-event-key');
    window.location.reload();
  }

  private getMatchByNumber(matchNumber: number): Match | null {
    const { matches } = this.props;
    return matches?.find((x) => x.matchNumber === matchNumber) ?? null;
  }

  private setShowRankings(value: boolean): void {
    update(child(this.eventRef, 'options'), {
      showRankings: value,
    });
  }

  private decrementMatchNumber(): void {
    const { event } = this.props;

    if (event.mode !== 'assisted') return;
    const matchNumber = event.currentMatchNumber ?? 0;
    update(this.eventRef, {
      currentMatchNumber: matchNumber - 1,
    });
  }

  private incrementMatchNumber(): void {
    const { event } = this.props;

    if (event.mode !== 'assisted') return;
    const matchNumber = event.currentMatchNumber ?? 0;
    update(this.eventRef, {
      currentMatchNumber: matchNumber + 1,
    });
  }

  private swapMode(mode: AppMode | null = null): void {
    let appMode = mode;
    const { event } = this.props;
    const { loadingState } = this.state;

    if (appMode === null) appMode = event.mode === 'assisted' ? 'automatic' : 'assisted';
    if (appMode === 'assisted') {
      if (loadingState === 'noAutomatic' || event.currentMatchNumber === null) {
        this.updateMatches();
      }
      update(this.eventRef, {
        mode: 'assisted',
      });
    } else if (appMode === 'automatic') {
      update(this.eventRef, {
        mode: 'automatic',
      });
    }

    AnalyticsService.logEvent('modeSwitch', {});
  }

  private updateMatches(): void {
    const { event } = this.props;

    const matchNumber = event.currentMatchNumber;

    if (matchNumber === null || matchNumber === undefined) {
      update(this.eventRef, {
        currentMatchNumber: 1,
      });
      return;
    }

    try {
      console.log('Match number changed, updating state');
      this.setState({
        currentMatch: this.getMatchByNumber(matchNumber),
        nextMatch: this.getMatchByNumber(matchNumber + 1),
        // By default, we'll take the three matches after the one on deck
        queueingMatches: [2, 3, 4].map((x) => this.getMatchByNumber(matchNumber + x))
          .filter((x) => x !== null) as Match[],
        loadingState: 'ready',
      });
    } catch (e) {
      this.setState({
        loadingState: 'error',
      });
      console.error(e);
    }
  }

  render(): JSX.Element {
    const {
      loadingState, currentMatch, nextMatch, queueingMatches, teamAvatars, showMenu, rankings,
    } = this.state;
    const { event, matches, season } = this.props;
    return (
      <div>
        <div className={[styles.menu, showMenu ? '' : styles.hidden].join(' ')}>
          <div className={styles.actions}>
            <div>
              <label htmlFor="modeSelect">
                Mode:
                {/* @ts-ignore */}
                <select value={event.mode} onInput={(e): void => this.swapMode(e.target.value)} id="modeSelect">
                  <option value="automatic">Automatic</option>
                  <option value="assisted">Assisted</option>
                </select>
              </label>

              {event.mode === 'assisted' && <div className={styles.assistedInstruction}>Use the left/right arrow keys to change current match</div>}

              <label htmlFor="rankingDisplay">
                Rankings:
                {/* @ts-ignore */}
                <input type="checkbox" checked={event.options?.showRankings ?? false} onInput={(e): void => this.setShowRankings(e.target.checked)} id="rankingDisplay" />
              </label>
            </div>
            <span>
              {event.name}
              {' '}
              ({season})
            </span>
            <button type="button" onClick={(): void => Queueing.onLogout()}>Log out</button>
          </div>
        </div>
        <div className={styles.fullHeight}>
          {loadingState === 'loading' && <div className={styles.infoText}>Loading matches...</div>}
          {loadingState === 'error' && <div className={styles.infoText}>Failed to fetch matches</div>}
          {loadingState === 'noAutomatic' && <div className={styles.infoText}>Unable to run in automatic mode. Press the &apos;a&apos; key to switch modes.</div>}
          {loadingState === 'ready' && !matches?.length && <div className={styles.infoText}>Waiting for schedule to be posted...</div>}
          {loadingState === 'ready' && matches?.length
            && (
            <div className={styles.qualsDisplay}>
              <div className={styles.matches}>
                <div className={styles.topBar}>
                  {currentMatch && (
                  <div>
                    <MatchDisplay halfWidth match={currentMatch} teamAvatars={teamAvatars} />
                    <span className={styles.description}>On Field</span>
                  </div>
                  )}
                  {nextMatch && (
                  <div>
                    <MatchDisplay halfWidth match={nextMatch} teamAvatars={teamAvatars} />
                    <span className={styles.description}>On Deck</span>
                  </div>
                  )}
                </div>
                {queueingMatches.map((x) => (
                  <MatchDisplay match={x} key={x.matchNumber} teamAvatars={teamAvatars} />
                ))}
              </div>
              {(event.options?.showRankings ?? false ? (
                <RankingList>
                  {rankings.map((x) => (<Ranking teamNumber={x.teamNumber} ranking={x.rank} />))}
                </RankingList>
              ) : '')}
            </div>
            )}
        </div>
      </div>
    );
  }
}

Queueing.defaultProps = {
  matches: undefined,
};
