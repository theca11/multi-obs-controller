import { AbstractStatelessRequestAction } from '../BaseRequestAction';
import { SingleRequestPayload } from '../types';

type ActionSettings = { requestType: string, requestData: string }

export class RawRequestAction extends AbstractStatelessRequestAction<ActionSettings> {
	constructor() {
		super('dev.theca11.multiobs.rawrequest');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getPayloadFromSettings(settings: Partial<ActionSettings> | Record<string, never>): SingleRequestPayload<any> {
		const { requestType, requestData } = settings;
		return {
			requestType: requestType,
			requestData: requestData ? JSON.parse(requestData) : {},
		};
	}
}
