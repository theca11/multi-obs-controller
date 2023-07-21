/// <reference path="../../libs/js/action.js" />
import { sockets } from "../sockets.js";
import { SDUtils } from '../utils.js';

const DEFAULT_ACTION_SETTINGS = {
	common: { target: 0, indivParams: false },
	params1: {},
	params2: {}
};

/** Base class for all actions used to send OBS WS requests */
export class OBSWebsocketAction extends Action {
	_hideActionFeedback = false;
	_titleParam = '';

	/**
	 * @param {string} UUID Action UUID string, as defined in manifest.json
	 * @param {string} titleParam Settings param to use as default key title
	 */
	constructor(UUID, titleParam = '') {
		super(UUID);
		this._titleParam = titleParam;

		// Main logic when key is pressed
		this.onKeyUp(async ({ context, payload }) => {
			const { settings, userDesiredState } = payload;
			const actionSettings = { ...DEFAULT_ACTION_SETTINGS, ...settings };

			// 1. Get settings per instance, as expected later for OBS WS call, in an array
			const instancesSettings = [];
			const target = parseInt(actionSettings.common.target);
			const { indivParams } = actionSettings.common; 
			for (let i = 0; i < sockets.length; i++) {
				let instanceSettings = { requestType: 'NoRequest' };
				const paramsKey = `params${(target === 0 && !indivParams) ? 1 : i + 1}`;
				if (paramsKey in actionSettings) {
					try {
						instanceSettings = this.getPayloadFromSettings(actionSettings[paramsKey], userDesiredState);
					}
					catch(e) {
						SDUtils.log(`[ERROR] Error parsing action settings - request will be invalid`);
					}
				}
				instancesSettings.push(instanceSettings);
			}

			// 2. Send WS requests
			const results = await this.sendWsRequests(target, instancesSettings);

			// 3. Log potential errors and send key feedback
			const actionId = this.UUID.replace('dev.theca11.multiobs.', '');
			const rejectedResult = results.find(result => result.status === 'rejected');	// target socket not connected or regular request failed
			if (rejectedResult) {
				SDUtils.log(`[ERROR][OBS_${results.indexOf(rejectedResult)+1}][${actionId}] ${rejectedResult.reason?.message ?? 'Not connected'}`);
				if (!this._hideActionFeedback) $SD.showAlert(context);
			}
			else {	// if a batch request, response is an array and everything must have requestStatus.result === true
				const socketsReponses = results.map(result => result.value);
				const firstRejectedResponse = socketsReponses.find(socketResponse => Array.isArray(socketResponse) && socketResponse.some(resp => !resp.requestStatus.result));
				if (firstRejectedResponse) {
					const reason = firstRejectedResponse.find(resp => !resp.requestStatus.result).requestStatus.comment;
					SDUtils.log(`[ERROR][OBS_${socketsReponses.indexOf(firstRejectedResponse)+1}][${actionId}] ${reason}`);
					if (!this._hideActionFeedback) $SD.showAlert(context);
					return;
				}

				if (!this._hideActionFeedback) $SD.showOk(context);
			}
		})

		// When PI is loaded and ready, extra optional logic per action
		this.onSendToPlugin(async ({context, action, payload}) => {
			if (payload.event === 'ready') {
				await this.onPropertyInspectorReady({context, action})
				.catch(() => SDUtils.log('[ERROR] Error executing custom onPropertyInspectorReady()'));
			}
		})

		// Update hideActionFeeback variable from global settings
		$SD.onDidReceiveGlobalSettings(({payload}) => {
			this._hideActionFeedback = payload.settings.feedback === 'hide';
		})

		// Set key title on init and when settings are updated
		if (titleParam) {
			this.onWillAppear(({context, payload}) => {
				this.updateTitle(context, payload.settings, titleParam);
			})

			this.onDidReceiveSettings(({context, payload}) => {
				this.updateTitle(context, payload.settings, titleParam);
			})
		}
	}

	/**
	 * Gets a proper OBS WS request payload from the actions settings saved for a particular OBS instance
	 * @param {object} settings Actions settings associated with a particular OBS instance
	 * @param {number} desiredState If in multiaction, the desired state by the user
	 * @returns Object or array of objects properly formatted as OBS WS request payload
	 * @throws Error if not implemented (abstract method)
	 */
	getPayloadFromSettings(settings, desiredState = undefined) { 
		throw new Error('The base class getPayloadFromSettings should not be called - child class need to implement this method');
	}

	/**
	 * Sends OBS WS requests to OBS socket instances
	 * @param {number} target The OBS socket to send the request to. 0 = all, 1 = OBS#1, 2 = OBS#2
	 * @param {Array} payloadsArray An array containing a request payload for each OBS socket instance
	 * @returns Array of results of the WS request, one per OBS instance
	 */
	async sendWsRequests(target, payloadsArray) {
		const results = await Promise.allSettled(
			sockets.map((socket, idx) => {
				const payload = payloadsArray[idx];
				if (target === 0 || target === idx + 1) {
					if (!socket.isConnected) return Promise.reject('Not connected to OBS WS server');
					return payload.requestType
						? socket.call(payload.requestType, payload.requestData)
						: socket.callBatch(payload.requests, payload.options)
				}
				else {
					return Promise.resolve();
				}
			})
		);
		return results;
	}

	/**
	 * Triggers when PI has imported everything and is ready to be shown to the user
	 */
	async onPropertyInspectorReady({context, action}) { return; }

	/**
	 * Updates key title with the corresponding settings param string, depending on configured target
	 */
	updateTitle(context, settings, settingsParam) {
		if (!settings.common) return;
		const target = Number(settings.common.target);
		if (target === 0) {
			SDUtils.setKeyTitle(context, settings.params1[settingsParam] || settings.params2[settingsParam]);
		}
		else {
			SDUtils.setKeyTitle(context, settings[`params${target}`][settingsParam]);
		}
	}
}