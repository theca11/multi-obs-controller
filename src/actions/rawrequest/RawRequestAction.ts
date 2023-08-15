import { AbstractStatelessWsAction } from '../AbstractStatelessWsAction';

export class RawRequestAction extends AbstractStatelessWsAction {
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
