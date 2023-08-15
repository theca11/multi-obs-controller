import { AbstractBaseWsAction } from '../AbstractBaseWsAction';

export class RawRequestAction extends AbstractBaseWsAction {
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
