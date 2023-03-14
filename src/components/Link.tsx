import { h } from 'preact';
import { Link as RouterLink } from 'preact-router';

// eslint-disable-next-line react/jsx-props-no-spreading
const Link = (props: any) => (<RouterLink {...props} />);

export default Link;
