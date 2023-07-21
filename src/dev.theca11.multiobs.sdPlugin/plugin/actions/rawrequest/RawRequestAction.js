import { OBSWebsocketAction } from '../OBSWebsocketAction.js';

export class RawRequestAction extends OBSWebsocketAction {
	constructor() {
		super('dev.theca11.multiobs.rawrequest');
	}

	getPayloadFromSettings(settings) {
		const { requestType, requestData } = settings;
		return {
			requestType: requestType,
			requestData: JSON.parse(requestData ?? {}),
		};
	}
}
