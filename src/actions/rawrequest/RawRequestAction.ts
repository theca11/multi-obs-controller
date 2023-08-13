import { OBSWebsocketAction } from '../OBSWebsocketAction';

export class RawRequestAction extends OBSWebsocketAction {
	constructor() {
		super('dev.theca11.multiobs.rawrequest');
	}

	getPayloadFromSettings(settings: any) {
		const { requestType, requestData } = settings;
		return {
			requestType: requestType,
			requestData: JSON.parse(requestData ?? {}),
		};
	}
}
