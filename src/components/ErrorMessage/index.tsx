import { ComponentChildren, h } from 'preact';

import styles from './styles.module.scss';

export type ErrorMessageType = 'info' | 'arrow' | 'warning' | 'error';
export type ErrorMessageProps = {
  children: ComponentChildren,
  type?: ErrorMessageType,
};

const ErrorMessage = (props: ErrorMessageProps) => {
  const { children } = props;
  let { type } = props;
  if (type === undefined) type = 'info';

  return (
    <div className={styles.errorMessage}>
      <div
        aria-hidden="true"
        className={[styles.symbol, styles[type]].join(' ')}
      />
      { children }
    </div>
  );
};

ErrorMessage.defaultProps = {
  type: 'info',
};

export default ErrorMessage;
