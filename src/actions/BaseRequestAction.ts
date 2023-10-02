import { ResponseMessage } from 'obs-websocket-js';
import { sockets } from '../plugin/sockets';
import { SDUtils } from '../plugin/utils';
import { BatchRequestPayload, ConstructorParams, KeyDownData, PartiallyRequired, PersistentSettings, RequestPayload, SingleRequestPayload } from './types';
import { AbstractBaseWsAction } from './BaseWsAction';
import { StateEnum } from './StateEnum';
import { globalSettings } from './globalSettings';

/** Base class for all actions used to send OBS WS requests */
export abstract class AbstractBaseRequestAction extends AbstractBaseWsAction {

	constructor(UUID: string, params?: Partial<ConstructorParams>) {
		super(UUID, params);

		this.onSinglePress(({ context, payload }: KeyDownData<PersistentSettings>) => {
			const { settings, userDesiredState, isInMultiAction } = payload;
			if (isInMultiAction || !settings.advanced?.longPress) {
				this._execute(context, settings, userDesiredState);
			}
		});

		this.onLongPress(({ context, payload }: KeyDownData<PersistentSettings>) => {
			const { settings, userDesiredState } = payload;
			if (settings.advanced?.longPress) {
				this._execute(context, settings, userDesiredState);
			}
		});
	}

	/**
	 * Execute the main logic of the action
	 * @param context Action context string
	 * @param persistentSettings Action settings saved for the action
	 * @param userDesiredState Desired state, if in multiaction and set by the user
	 */
	async _execute(context: string, persistentSettings: PersistentSettings, userDesiredState?: number) {

		// 1. Get settings per instance, as expected later for OBS WS call, in an array
		const settingsArray = this.getSettingsArray(persistentSettings);
		const payloadsArray = settingsArray.map(settings => {
			try {
				if (!settings) return null;
				return this.getPayloadFromSettings(settings, userDesiredState);
			}
			catch {
				SDUtils.logError('Error parsing action settings - request will be invalid');
				return { requestType: 'InvalidRequest' };
			}
		});

		// 2. Send WS requests
		const results = await this.sendWsRequests(payloadsArray);

		// 3. Log potential errors and send key feedback
		const hideActionFeedback = globalSettings.feedback === 'hide';
		const actionId = this.UUID.replace('dev.theca11.multiobs.', '');
		const rejectedResult = results.find(result => result.status === 'rejected');	// target socket not connected or regular request failed
		if (rejectedResult) {
			SDUtils.logError(`[OBS_${results.indexOf(rejectedResult) + 1}][${actionId}] ${(rejectedResult as PromiseRejectedResult).reason?.message ?? 'Not connected'}`);
			if (!hideActionFeedback) setTimeout(() => $SD.showAlert(context), 150);
		}
		else {	// if a batch request, response is an array and everything must have requestStatus.result === true
			const socketsReponses = results.map(result => (result as PromiseFulfilledResult<unknown>).value);
			const firstRejectedResponse = socketsReponses.find(socketResponse => Array.isArray(socketResponse) && (socketResponse as ResponseMessage[]).some(resp => !resp.requestStatus.result));
			if (firstRejectedResponse) {
				const reqStatus = (firstRejectedResponse as ResponseMessage[]).find((resp) => !resp.requestStatus.result)?.requestStatus;
				const reason = reqStatus ? (reqStatus as { comment: string }).comment : 'Unknown reason';
				SDUtils.logError(`[OBS_${socketsReponses.indexOf(firstRejectedResponse) + 1}][${actionId}] ${reason}`);
				if (!hideActionFeedback) setTimeout(() => $SD.showAlert(context), 150);
				return;
			}

			if (!hideActionFeedback && this._showSuccess) setTimeout(() => $SD.showOk(context), 150);
		}
	}

	/**
	 * Get a proper OBS WS request payload from the actions settings saved for a particular OBS instance
	 * @param settings Actions settings associated with a particular OBS instance
	 * @param desiredState If in multiaction, the desired state by the user
	 * @returns Object or array of objects properly formatted as OBS WS request payload
	 */
	abstract getPayloadFromSettings(settings: any, desiredState?: number): SingleRequestPayload<any> | BatchRequestPayload;

	/**
	 * Send OBS WS requests to OBS socket instances
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
						: socket.callBatch(payload.requests, payload.options);
				}
				else {
					return Promise.resolve();
				}
			}),
		);
		return results;
	}
}

export { AbstractBaseRequestAction as AbstractStatelessRequestAction };

export abstract class AbstractStatefulRequestAction extends AbstractBaseRequestAction {

	constructor(UUID: string, params: PartiallyRequired<ConstructorParams, 'statusEvent'>) {
		super(UUID, params);
		this._showSuccess = false;	// success already shown via event updates
	}

	abstract override fetchState(socketSettings: Record<string, any>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Inactive>;
	abstract override shouldUpdateState(evtData: any, socketSettings: any, socketIdx: number): Promise<boolean>;
	abstract override getStateFromEvent(evtData: Record<string, any>, socketSettings: Record<string, any>): Promise<StateEnum>;
}