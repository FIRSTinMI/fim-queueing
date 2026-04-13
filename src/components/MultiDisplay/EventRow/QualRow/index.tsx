import { h, Fragment } from 'preact';
import { Event, QualMatch } from '@shared/DbTypes';
import { AnimatePresence } from 'motion/react';
import styles from '../sharedStyles.module.scss';
import AllianceFader from '../AllianceFader';
import useQueueingQualMatches from '@/hooks/useQueueingQualMatches';
import PushInDiv from '../Shared/PushInDiv';
import MessageRow from '../MessageRow';

function QualRow({
  event,
  showLine,
  token,
}: {
  event: Event,
  showLine: 0 | 1 | null;
  token: string;
}) {
  const queueingQualMatches = useQueueingQualMatches({
    token,
    numQueueing: 1,
  });
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

  // Loading/Error Text
  if (state !== 'ready' || !hasSchedule) {
    let message = 'Loading Matches...';
    if (state === 'error') {
      message = 'Failed to fetch matches';
    } else if (state !== 'loading' && !hasSchedule) {
      message = 'Waiting for schedule to be posted...';
    }
    return (
      <MessageRow
        event={event}
        overrideMessage={message}
      />
    );
  }

  // Ready and we have matches
  if (state === 'ready' && hasSchedule) {
    return (
      <>
        <td style={{ position: 'relative' }}>
          <AnimatePresence>
            {now && (
              <>
                {/* Current Match */}
                {now && now.type === 'match' && (
                  <PushInDiv className={styles.matchNumber} key={`m${now.number}`}>
                    {now.number}
                  </PushInDiv>
                )}

                {/* Current Match is Break */}
                {now && now.type === 'break' && (
                  <PushInDiv className={styles.textCenter} key={`b${now.description}`}>
                    {now.description}
                  </PushInDiv>
                )}
              </>
            )}
          </AnimatePresence>
        </td>

        {/* Next Match */}
        <td className={styles.textCenter} style={{ position: 'relative' }}>
          {/* Is a Match */}
          <AnimatePresence>
            {next && next.type === 'match' && (
              <PushInDiv key={`m${next.number}`}>
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
              </PushInDiv>
            )}

            {/* Is a Break */}
            {next && next.type === 'break' && (
              <PushInDiv key={`b${next.description}`}>
                {next.description}
              </PushInDiv>
            )}
          </AnimatePresence>
        </td>

        {/* Queueing Matches */}
        <td className={styles.textCenter} style={{ position: 'relative' }}>
          <AnimatePresence>
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
                    <PushInDiv key={`m${queueing[0].number}`}>
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
                    </PushInDiv>
                )}

                {/* Is a Break */}
                {next && queueing[0].type === 'break' && (
                  <PushInDiv key={`b${queueing[0].description}`}>
                    {queueing[0].description}
                  </PushInDiv>
                )}
              </>
            )}
          </AnimatePresence>
        </td>
      </>
    );
  }

  return null;
}

export default QualRow;
