import { h, Fragment } from 'preact';
import { QualMatch, Event } from '@shared/DbTypes';
import styles from '../sharedStyles.module.scss';
import AllianceFader from '../AllianceFader';
import MessageRow from '../MessageRow';
import useQueueingQualMatches from '@/hooks/useQueueingQualMatches';

function QualRow({
  event,
  showLine,
  token,
}: {
  event: Event;
  showLine: 0 | 1 | null;
  token: string;
}) {
  const queueingQualMatches = useQueueingQualMatches({
    token,
    numQueueing: 1,
  });
  // URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const useShortName = typeof searchParams.get('useShortName') === 'string';

  // Calculate Red alliance string
  const getRedStr = (match: QualMatch | null): string => {
    if (!match) return '';
    return `${match.participants.Red1} ${match.participants.Red2} ${match.participants.Red3}`;
  };

  // Calculate Blue alliance string
  const getBlueStr = (match: QualMatch | null): string => {
    if (!match) return '';
    return `${match.participants.Blue1} ${match.participants.Blue2} ${match.participants.Blue3}`;
  };

  const {
    state, now, next, queueing, hasSchedule,
  } = queueingQualMatches;

  // Message cases
  const case1 = ['loading', 'error'].includes(state);
  const case2 = state === 'ready' && !hasSchedule;

  // Loading/Error Text
  if (case1 || case2) {
    return (
      <>
        {/* Message */}
        <MessageRow event={event} showLine={showLine} />

        {/* Loading */}
        <tr>
          <td colSpan={4} className={styles.textCenter}>
            {event && event.name && (
              <span>
                <b>{event.name}</b>
                <br />
              </span>
            )}
            <span>
              {/* eslint-disable-next-line no-nested-ternary */}
              {state === 'error' && case1
                ? 'Failed to fetch matches'
                : state === 'loading' && !hasSchedule
                  ? 'Waiting for schedule to be posted...'
                  : 'Loading Matches...'}
            </span>
          </td>
        </tr>
      </>
    );
  }

  // Ready and we have matches
  if (state === 'ready' && hasSchedule) {
    return (
      <>
        {/* Message */}
        <MessageRow event={event} showLine={showLine} />

        {/* Quals */}
        <tr style={{ height: '22vh' }}>
          {/* Field Name / Logo */}
          <td>
            {/* Use event logo */}
            {!useShortName && (
              <img
                src={event.branding?.logo || ''}
                alt={event.name}
                className={styles.sponsorLogo}
              />
            )}

            {/* Use event short name */}
            {useShortName && (
              <div
                className={`${styles.textLeft} ${styles.bold} ${styles.eventName}`}
                // style={{ width: '15vw', fontSize: '8.5vw' }}
              >
                {/* <Textfit mode="single" forceSingleModeWidth max="300"> */}
                  {event.nameShort || event.name}
                {/* </Textfit> */}
              </div>
            )}
          </td>

          {/* Current Match */}
          {now && now.type === 'match' && (
            <td className={styles.matchNumber}>
              {(now as QualMatch)?.number}
            </td>
          )}

          {/* Current Match is Break */}
          {now && now.type === 'break' && (
            <td className={styles.textCenter}>
              {now.description}
            </td>
          )}

          {/* Next Match */}
          <td className={styles.textCenter}>
            {/* Is a Match */}
            {next && next.type === 'match' && (
              <Fragment>
                <span className={styles.matchNumber}>
                  {next.number}
                </span>
                {showLine !== null && (
                  <span className={styles.nextMatchScroll}>
                    <AllianceFader
                      red={getRedStr(next)}
                      blue={getBlueStr(next)}
                      showLine={showLine}
                    />
                  </span>
                )}
              </Fragment>
            )}

            {/* Is a Break */}
            {next && next.type === 'break' && (
              next.description
            )}
          </td>

          {/* Queueing Matches */}
          <td className={styles.textCenter}>
            {/* Multiple Queueing Matches */}
            {queueing && queueing.length > 1
              && queueing.map((x) => {
                // Is a match, not a break
                if (x && x.type === 'match') {
                  const match = x as QualMatch;
                  return (
                    <div className={styles.flexRow}>
                      <span className={styles.queueingMatchNumber}>{match.number} -</span>
                      {showLine !== null && (
                        <div style={{ marginLeft: '16vw', position: 'relative', top: '4vh' }}>
                          <AllianceFader
                            red={getRedStr(match)}
                            blue={getBlueStr(match)}
                            showLine={showLine}
                          />
                        </div>
                      )}
                    </div>
                  );
                }

                // Is a break
                return (
                  <div className={styles.textCenter}>
                    {x.description}
                  </div>
                );
              })}

            {/* Single Queueing Match */}
            {queueing?.length === 1 && queueing[0] && (
              <>
                {queueing[0]
                  && queueing[0].type === 'match' && (
                    <Fragment>
                      <span className={styles.matchNumber}>
                        {queueing[0].number}
                      </span>
                      {showLine !== null && (
                        <span>
                          <AllianceFader
                            red={getRedStr(queueing[0])}
                            blue={getBlueStr(queueing[0])}
                            showLine={showLine}
                          />
                        </span>
                      )}
                    </Fragment>
                )}

                {/* Is a Break */}
                {next && queueing[0].type === 'break' && (
                  queueing[0].description
                )}
              </>
            )}
          </td>
        </tr>
      </>
    );
  }

  return null;
}

export default QualRow;
