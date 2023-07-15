import { h, render } from 'preact';

import './style/vendor.scss';
import './style/index.css';
import App from './components/App';

render(<App />, document.getElementById('app') as Element);
export default App;
