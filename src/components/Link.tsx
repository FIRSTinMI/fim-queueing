import { h } from 'preact';
import { Link as RouterLink } from 'preact-router';

// eslint-disable-next-line react/jsx-props-no-spreading
function Link(props: any) {
  // eslint-disable-next-line react/jsx-props-no-spreading
  return (<RouterLink {...props} />);
}

export default Link;
