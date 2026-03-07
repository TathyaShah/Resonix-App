/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appNameFromConfig} from './app.json';
import TrackPlayer from 'react-native-track-player';
import { Provider } from 'react-redux';
import store from './src/redux/store.js';

// in case the metro cache still has an old app.json, we can log and fallback
const appName = appNameFromConfig || 'Resonix';
console.log('AppRegistry registering component with name:', appName);

const AppRedux=()=>(
    <Provider store={store}>
        <App/>
    </Provider>
)
AppRegistry.registerComponent(appName, () => AppRedux);
// fallback registrations in case native and JS names get out of sync
AppRegistry.registerComponent('Resonix', () => AppRedux);
AppRegistry.registerComponent('Player', () => AppRedux);
TrackPlayer.registerPlaybackService(()=>require('./service.js'));