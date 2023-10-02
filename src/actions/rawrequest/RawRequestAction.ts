import { AbstractStatelessRequestAction } from '../BaseRequestAction';

export class RawRequestAction extends AbstractStatelessRequestAction {
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
