import { OBSEventTypes, ResponseMessage } from 'obs-websocket-js';
import { sockets } from '../plugin/sockets';
import { SDUtils } from '../plugin/utils';
import { AbstractBaseWsAction } from './BaseWsAction';
import { StateEnum } from './StateEnum';
import { globalSettings } from './globalSettings';
import { BatchRequestPayload, ConstructorParams, KeyDownData, PartiallyRequired, PersistentSettings, RequestPayload, SingleRequestPayload, SocketSettings } from './types';

/** Base class for all actions used to send OBS WS requests */
export abstract class AbstractBaseRequestAction<T extends Record<string, unknown>> extends AbstractBaseWsAction<T> {

	constructor(UUID: string, params?: Partial<ConstructorParams>) {
		super(UUID, params);

		this.onSinglePress(({ context, payload }: KeyDownData<PersistentSettings<T>>) => {
			const { settings, userDesiredState, isInMultiAction } = payload;
			if (isInMultiAction || !settings.advanced?.longPress) {
				this._execute(context, userDesiredState);
			}
		});

		this.onLongPress(({ context, payload }: KeyDownData<PersistentSettings<T>>) => {
			const { settings, userDesiredState } = payload;
			if (settings.advanced?.longPress) {
				this._execute(context, userDesiredState);
			}
		});
	}

	/**
	 * Execute the main logic of the action
	 * @param context Action context string
	 * @param userDesiredState Desired state, if in multiaction and set by the user
	 */
	private async _execute(context: string, userDesiredState?: number) {

		// 1. Get settings per instance, as expected later for OBS WS call, in an array
		if (!this.contexts.has(context)) return;
		const { settings, states } = this.contexts.get(context)!;
		const payloadsArray = settings.map((socketSettings, socketIdx) => {
			try {
				if (!socketSettings) return null;
				return this.getPayloadFromSettings(socketIdx, socketSettings, states[socketIdx], userDesiredState);
			}
			catch {
				SDUtils.logActionError(socketIdx, this._actionId, 'Error parsing action settings - request will be invalid');
				return { requestType: 'InvalidRequest' };
			}
		});

		// 2. Send WS requests
		const results = await this._sendWsRequests(payloadsArray);

		// 3. Log potential errors and send key feedback
		const hideActionFeedback = globalSettings.feedback === 'hide';
		const rejectedResult = results.find(result => result.status === 'rejected');	// target socket not connected or regular request failed
		if (rejectedResult) {
			SDUtils.logActionError(results.indexOf(rejectedResult), this._actionId, (rejectedResult as PromiseRejectedResult).reason?.message ?? 'Not connected');
			if (!hideActionFeedback) setTimeout(() => $SD.showAlert(context), 150);
		}
		else {	// if a batch request, response is an array and everything must have requestStatus.result === true
			const socketsReponses = results.map(result => (result as PromiseFulfilledResult<unknown>).value);
			const firstRejectedResponse = socketsReponses.find(socketResponse => Array.isArray(socketResponse) && (socketResponse as ResponseMessage[]).some(resp => !resp.requestStatus.result));
			if (firstRejectedResponse) {
				const reqStatus = (firstRejectedResponse as ResponseMessage[]).find((resp) => !resp.requestStatus.result)?.requestStatus;
				const reason = reqStatus ? (reqStatus as { comment: string }).comment : 'Unknown reason';
				SDUtils.logActionError(socketsReponses.indexOf(firstRejectedResponse), this._actionId, reason);
				if (!hideActionFeedback) setTimeout(() => $SD.showAlert(context), 150);
				return;
			}

			if (!hideActionFeedback && this._showSuccess) setTimeout(() => $SD.showOk(context), 150);
		}
	}

	/**
	 * Get a proper OBS WS request payload from the actions settings saved for a particular OBS instance
	 * @param socketIdx Index of the associated OBS socket
	 * @param settings Actions settings associated with a particular OBS instance
	 * @param state Current action state for the particular OBS instance
	 * @param desiredState If in multiaction, the desired state by the user
	 * @returns Object or array of objects properly formatted as OBS WS request payload
	 */
	abstract getPayloadFromSettings(socketIdx: number, settings: Exclude<SocketSettings<T>, null>, state: StateEnum, desiredState?: number): SingleRequestPayload<any> | BatchRequestPayload;

	/**
	 * Send OBS WS requests to OBS socket instances
	 * @param {Array} payloadsArray An array containing a request payload for each OBS socket instance
	 * @returns Array of results of the WS request, one per OBS instance
	 */
	private async _sendWsRequests(payloadsArray: RequestPayload[]) {
		const results = await Promise.allSettled(
			sockets.map((socket, idx) => {
				const payload = payloadsArray[idx];
				if (payload) {
					if (!socket.isConnected) return Promise.reject(new Error('Not connected to OBS WS server'));
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

export abstract class AbstractStatefulRequestAction<T extends Record<string, unknown>, U extends keyof OBSEventTypes> extends AbstractBaseRequestAction<T> {
	constructor(UUID: string, params: PartiallyRequired<ConstructorParams, 'statusEvent'>) {
		super(UUID, params);
		this._showSuccess = false;	// success already shown via event updates
	}

	abstract override fetchState(socketSettings: NonNullable<SocketSettings<T>>, socketIdx: number): Promise<Exclude<StateEnum, StateEnum.Unavailable | StateEnum.None>>;
	abstract override shouldUpdateState(evtData: OBSEventTypes[U], socketSettings: SocketSettings<T>, socketIdx: number): Promise<boolean>;
	abstract override getStateFromEvent(evtData: OBSEventTypes[U], socketSettings: SocketSettings<T>): StateEnum;
}