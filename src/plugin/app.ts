import * as pluginActions from '../actions/index';
import { DidReceiveGlobalSettingsData, GlobalSettings } from '../actions/types';
import { sockets } from './sockets';
import { SDUtils } from './utils';

// Initialize all plugin actions
for (const PluginAction of Object.values(pluginActions)) {
	new PluginAction();
}

// SD starts
$SD.onConnected(({ appInfo }: any) => {
	SDUtils.log(`Stream Deck connected (v${appInfo.application.version}) | ${appInfo.application.platform} ${appInfo.application.platformVersion} | Plugin version ${appInfo.plugin.version}`);
	$SD.getGlobalSettings();

	// Check OBS WS connections every 10s
	setInterval(() => {
		sockets.forEach(socket => socket.tryConnect());
	}, 10 * 1000);
});

// Global settings received
$SD.onDidReceiveGlobalSettings(({ payload }: DidReceiveGlobalSettingsData<GlobalSettings>) => {
	const { settings } = payload;
	sockets.forEach((socket, idx) => {
		const i = idx + 1;
		socket.updateSettings(settings[`ip${i}`] ?? '', settings[`port${i}`] ?? '', settings[`pwd${i}`]);
	});
});