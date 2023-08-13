import { OBSRequestTypes, RequestBatchOptions, RequestBatchRequest, ResponseMessage } from "obs-websocket-js";
import { NUM_SOCKETS, sockets } from "../plugin/sockets";
import { evtEmitter } from "./status";
import { SDUtils, ImageUtils, CanvasUtils } from '../plugin/utils';
import type { DidReceiveGlobalSettingsData, DidReceiveSettingsData, GlobalSettings, KeyUpData, PersistentSettings, RequestPayload, SendToPluginData, WillAppearData, WillDisappearData } from './types'

type ConstructorParams = {
	titleParam: string,
	statusEvent: string,
}

/** Base class for all actions used to send OBS WS requests */
export abstract class OBSWebsocketAction extends Action {
	_hideActionFeedback = false;
	_ctxSettingsCache = new Map();	// <context, settings> map (not included if in multiaction)
	_ctxStatesCache = new Map();	// <context, statesArray> map (not included if in multiaction)


	constructor(UUID: string, params?: Partial<ConstructorParams>) {
		super(UUID);
		const { titleParam, statusEvent } = params ?? {};

		// Attach listener to status event, if provided, to update key image
		if (statusEvent) {
			evtEmitter.on(statusEvent, (evtSocketIdx, evtData) => {
				this.updateImages(evtSocketIdx, evtData);
			});
		}

		// Keep cache of actions
		this.onWillDisappear(({context}: WillDisappearData<PersistentSettings>) => {
			this._ctxSettingsCache.delete(context);
			this._ctxStatesCache.delete(context);
		});
		this.onWillAppear(async ({context, payload}: WillAppearData<PersistentSettings>) => {
			const { settings, isInMultiAction } = payload;
			if (isInMultiAction) return;

			// Update key title
			if (titleParam) this.updateTitle(context, payload.settings, titleParam);

			// Update key image
			this._ctxSettingsCache.set(context, settings);
			try {
				this._ctxStatesCache.set(context, await this.fetchStates(settings).catch(() => null))
				const img = await this.getBaseKeyImage();
				this.updateKeyImage(context, this.getTarget(settings), img);
			}
			catch(e) {
				console.error(e)
			}
		});

		this.onDidReceiveSettings(async ({context, payload}: DidReceiveSettingsData<PersistentSettings>) => {
			const { settings, isInMultiAction } = payload;
			if (isInMultiAction) return;

			// Update key title
			if (titleParam) this.updateTitle(context, payload.settings, titleParam);

			// Update key image
			this._ctxSettingsCache.set(context, settings);
			this._ctxStatesCache.set(context, await this.fetchStates(settings).catch(() => null))
			try {
				const img = await this.getBaseKeyImage();
				this.updateKeyImage(context, this.getTarget(settings), img);
			}
			catch(e) {
				console.error(e)
			}
		});

		evtEmitter.on('SocketInitialized', async (socketIdx) => {
			console.log('socket connected')
			for (const [ctx, settings] of this._ctxSettingsCache) {
				const settingsArray = this.getSettingsArray(settings);
				const newState = this.fetchState ? await this.fetchState(settingsArray[socketIdx], socketIdx).catch(() => null) : undefined;
				console.log(newState)
				this.updateStatesCache(ctx, socketIdx, newState);
			}
			this.updateImages();
		});
		evtEmitter.on('SocketDisconnected', (socketIdx) => {
			console.log('Socket disconnected')
			for (const [ctx, _states] of this._ctxStatesCache) {
				this.updateStatesCache(ctx, socketIdx, null);
			}
			this.updateImages();
		});

		// Main logic when key is pressed
		this.onKeyUp(async ({ context, payload }: KeyUpData<PersistentSettings>) => {
			const { settings, userDesiredState } = payload;

			// 1. Get settings per instance, as expected later for OBS WS call, in an array
			const settingsArray = this.getSettingsArray(settings);
			const payloadsArray = settingsArray.map(settings => {
				try {
					if (!settings) return null;
					return this.getPayloadFromSettings(settings, userDesiredState);
				}
				catch {
					SDUtils.log(`[ERROR] Error parsing action settings - request will be invalid`);
					return { requestType: 'InvalidRequest' };
				}
			});

			// 2. Send WS requests
			const results = await this.sendWsRequests(payloadsArray);

			// 3. Log potential errors and send key feedback
			const actionId = this.UUID.replace('dev.theca11.multiobs.', '');
			const rejectedResult = results.find(result => result.status === 'rejected');	// target socket not connected or regular request failed
			if (rejectedResult) {
				SDUtils.log(`[ERROR][OBS_${results.indexOf(rejectedResult)+1}][${actionId}] ${(rejectedResult as PromiseRejectedResult).reason?.message ?? 'Not connected'}`);
				if (!this._hideActionFeedback) $SD.showAlert(context);
			}
			else {	// if a batch request, response is an array and everything must have requestStatus.result === true
				const socketsReponses = results.map(result => (result as PromiseFulfilledResult<any>).value);
				const firstRejectedResponse = socketsReponses.find(socketResponse => Array.isArray(socketResponse) && socketResponse.some(resp => !resp.requestStatus.result));
				if (firstRejectedResponse) {
					const reason = firstRejectedResponse.find((resp: ResponseMessage) => !resp.requestStatus.result).requestStatus.comment;
					SDUtils.log(`[ERROR][OBS_${socketsReponses.indexOf(firstRejectedResponse)+1}][${actionId}] ${reason}`);
					if (!this._hideActionFeedback) $SD.showAlert(context);
					return;
				}

				if (!this._hideActionFeedback) $SD.showOk(context);
			}
		})

		// When PI is loaded and ready, extra optional logic per action
		this.onSendToPlugin(async ({context, action, payload}: SendToPluginData<{event: string}>) => {
			if (payload.event === 'ready') {
				await this.onPropertyInspectorReady({context, action})
				.catch(() => SDUtils.log('[ERROR] Error executing custom onPropertyInspectorReady()'));
			}
		})

		// Update hideActionFeeback variable from global settings
		$SD.onDidReceiveGlobalSettings(({payload}: DidReceiveGlobalSettingsData<GlobalSettings>) => {
			this._hideActionFeedback = payload.settings.feedback === 'hide';
		})
	}

	/**
	 * Gets a proper OBS WS request payload from the actions settings saved for a particular OBS instance
	 * @param settings Actions settings associated with a particular OBS instance
	 * @param desiredState If in multiaction, the desired state by the user
	 * @returns Object or array of objects properly formatted as OBS WS request payload
	 */
	abstract getPayloadFromSettings(settings: any, desiredState?: number): any;

	/**
	 * Sends OBS WS requests to OBS socket instances
	 * @param {Array} payloadsArray An array containing a request payload for each OBS socket instance
	 * @returns Array of results of the WS request, one per OBS instance
	 */
	async sendWsRequests(payloadsArray: RequestPayload[]) {
		const results = await Promise.allSettled(
			sockets.map((socket, idx) => {
				const payload = payloadsArray[idx];
				if (payload) {
					if (!socket.isConnected) return Promise.reject('Not connected to OBS WS server');
					return 'requestType' in payload
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
	async onPropertyInspectorReady({context, action}: {context: string, action: string}) { return; }

	/**
	 * Updates key title with the corresponding settings param string, depending on configured target
	 */
	updateTitle(context: string, settings: PersistentSettings, settingsParam: string) {
		if (!settings.common) return;
		const target = Number(settings.common.target);	// to-do: use the convenient method here
		if (target === 0) {
			SDUtils.setKeyTitle(context, settings.params1?.[settingsParam] || settings.params2?.[settingsParam] || '');
		}
		else {
			SDUtils.setKeyTitle(context, settings[`params${target}`]?.[settingsParam] || '');
		}
	}

	// --- Update status image ---
	getBaseKeyImage(): Promise<HTMLImageElement> {
		const actionName = this.UUID.split('.').at(-1);
		const imgUrl = `../assets/actions/${actionName}/key.svg`;
		return ImageUtils.loadImagePromise(imgUrl);
	}

	async updateImages(evtSocketIdx = null, evtData = null) {
		try {
			const img = await this.getBaseKeyImage();
			if (evtSocketIdx !== null) {	// update state from event data
				for (const [context, settings] of this._ctxSettingsCache) {
					const socketSettings = this.getSettingsArray(settings)[evtSocketIdx];
					if (socketSettings && await this.shouldUpdateImage(evtData, socketSettings, evtSocketIdx)) {
						const newState = await this.getNewState(evtData, socketSettings);
						let prevStates = this._ctxStatesCache.get(context) ?? new Array(NUM_SOCKETS).fill(null);
						prevStates[evtSocketIdx] = newState;
						this._ctxStatesCache.set(context, prevStates);
					}
				}
			}
			for (const [context, settings] of this._ctxSettingsCache) {
				this.updateKeyImage(context, this.getTarget(settings), img)
			}
		}
		catch(e) {
			console.error(e);
		}
	}

	async fetchStates(settings: PersistentSettings) {
		const settingsArray = this.getSettingsArray(settings);
		const statesResults = await Promise.allSettled(settingsArray.map((socketSettings, idx) => {
			if (!socketSettings || !sockets[idx].isConnected) return Promise.reject();
			return this.fetchState ? this.fetchState(socketSettings, idx) : undefined;
		}))
		return statesResults.map(res => res.status === 'fulfilled' ? res.value : null);
	}

	async fetchState?(socketSettings: any, socketIdx: number): Promise<boolean | null | undefined>;

	async getNewState(evtData: any, socketSettings: any) {
		return false;
	}

	async shouldUpdateImage(evtData: any, socketSettings: any, socketIdx: number) {
		return true;
	}

	updateKeyImage(context: string, target: number, img: HTMLImageElement) {
		const states = this._ctxStatesCache.get(context);

		const canvas =  document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.globalCompositeOperation = 'source-over';

		canvas.width = 144;
		canvas.height = 144;

		// Draw image to canvas
		ctx.drawImage(img, 0, 0);

		// Draw target numbers
		ctx.globalCompositeOperation = 'source-over';
		ctx.fillStyle = "#999999";
		ctx.font = "bold 25px Arial";
		ctx.textBaseline = 'top';
		if (target === 0 || target === 1) {
			ctx.textAlign = 'left';
			ctx.fillText('1', 0 + 10, 10);
		}
		if (target === 0 || target === 2) {
			ctx.textAlign = 'right';
			ctx.fillText('2', 144 - 10, 10);
		}


		// Draw target status		
		if (target !== 0) {
			if (states[target-1] === null) {
				CanvasUtils.overlayLineVPattern(ctx, 0, 1);
			}
			else {
				CanvasUtils.overlayColor(ctx, states[target-1] ? '#3A9F2266' : '#33333366', 0, 1, states[target-1] ? 'destination-over' : 'source-over');
			}
		}
		else {
			for (let i = 0; i < states.length; i++) {
				if (states[i] === null) {
					CanvasUtils.overlayLineVPattern(ctx, i / 2, (i + 1) / 2);
				}
				else {
					CanvasUtils.overlayColor(ctx, states[i] ? '#3A9F2266' : '#33333366', i / 2, (i + 1) / 2, states[i] ? 'destination-over' : 'source-over');
				}
				
			}
		}

		// Get base64 img and set image
		const b64 = canvas.toDataURL('image/png', 1);
		$SD.setImage(context, b64);
	}

	// -- General helpers --
	getCommonSettings(settings: PersistentSettings) {
		settings = settings ?? {};
		return { 
			target: parseInt(settings.common?.target || '0'),
			indivParams: !!settings.common?.indivParams
		};
	}

	getTarget(settings: PersistentSettings): number {
		return this.getCommonSettings(settings).target;
	}

	getSettingsArray(settings: PersistentSettings) {
		settings = settings ?? {};
		const { target, indivParams } = this.getCommonSettings(settings);
		let settingsArray = [];
		for (let i = 0; i < sockets.length; i++) {
			if (target === 0 || target === i + 1) {
				settingsArray.push(settings[`params${(target === 0 && !indivParams) ? 1 : i + 1}`] ?? {});
			}
			else {
				settingsArray.push(null);
			}
		}
		return settingsArray;
	}

	updateStatesCache(context: string, socketIdx: number, newState: boolean | undefined | null) {
		let states = this._ctxStatesCache.get(context) ?? new Array(NUM_SOCKETS).fill(undefined);
		states[socketIdx] = newState;
		this._ctxStatesCache.set(context, states);
	}
}