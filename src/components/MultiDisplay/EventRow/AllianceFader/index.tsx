import { h } from 'preact';
import styles from './styles.module.scss';

function AllianceFader({
  red,
  blue,
  showLine,
}: {
  red: string;
  blue: string;
  showLine: 0 | 1;
}) {
  return (
    <div className={styles.faderBase}>
      <div
        className={styles.red}
        style={{
          opacity: showLine ? 0 : 1,
        }}
      >
        R: {red}
      </div>
      <div
        className={styles.blue}
        style={{
          opacity: showLine,
        }}
      >
        B: {blue}
      </div>
    </div>
  );
}

export default AllianceFader;
