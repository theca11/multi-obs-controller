import { OBSWebsocketAction } from '../OBSWebsocketAction.js';

export class RawBatchRequestAction extends OBSWebsocketAction {
	constructor() {
		super('dev.theca11.multiobs.rawbatchrequest');
	}

	getPayloadFromSettings(settings) {
		const { requestsArray, executionType, haltOnFailure } = settings;
		try {
			const requests = JSON.parse(requestsArray);
			return {
				requests: requests,
				options: {
					executionType: Number(executionType ?? 0),
					haltOnFailure: Boolean(haltOnFailure ?? false)
				}
			};
		}
		catch {
			return {requests: [{ requestType: 'NoRequest' }]};	// invalid request to trigger OBS error
		}
	}
}