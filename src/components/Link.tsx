import { h } from 'preact';
import { Link as RouterLink } from 'preact-router';

const Link = (props: any) => {
  const { href } = props;
  const hash = window?.location?.hash;

  // eslint-disable-next-line react/jsx-props-no-spreading
  return (<RouterLink {...props} href={`${href}${hash ?? ''}`} />);
};

export default Link;
