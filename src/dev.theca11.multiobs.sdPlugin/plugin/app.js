/// <reference path="../libs/js/action.js" />
/// <reference path="../libs/js/stream-deck.js" />
/// <reference path="sockets.js" />

import { sockets } from "./sockets.js";
import * as pluginActions from "./actions/index.js";
import { SDUtils } from "./utils.js";

// Initialize all plugin actions
for (const PluginAction of Object.values(pluginActions)) {
	new PluginAction();
}

// SD starts
$SD.onConnected(() => {
	SDUtils.log('[INFO] Stream Deck connected');
	$SD.getGlobalSettings();

	// Check OBS WS connections every 10s
	setInterval(() => {
		sockets.forEach(async socket => socket.tryConnect())
	}, 10 * 1000)
});

// Global settings received
$SD.onDidReceiveGlobalSettings(({payload}) => {
	const { settings } = payload;
	sockets.forEach((socket, idx) => {
		const i = idx + 1;
		socket.updateSettings(settings[`ip${i}`], settings[`port${i}`], settings[`pwd${i}`])
	})
})