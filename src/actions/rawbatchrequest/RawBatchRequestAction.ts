import { AbstractStatelessRequestAction } from '../BaseRequestAction';
import { BatchRequestPayload } from '../types';

type ActionSettings = { executionType: string, haltOnFailure: string, requestsArray: string }

export class RawBatchRequestAction extends AbstractStatelessRequestAction<ActionSettings> {
	constructor() {
		super('dev.theca11.multiobs.rawbatchrequest');
	}

	getPayloadFromSettings(socketIdx: number, settings: Record<string, never> | Partial<ActionSettings>): BatchRequestPayload {
		const { requestsArray, executionType, haltOnFailure } = settings;
		try {
			const requests = requestsArray ? JSON.parse(requestsArray) : [{ requestType: 'NoRequest' }];
			return {
				requests: requests,
				options: {
					executionType: Number(executionType ?? 0),
					haltOnFailure: Boolean(haltOnFailure ?? false),
				},
			};
		}
		catch {
			return { requests: [{ requestType: 'NoRequest' }] };	// invalid request to trigger OBS error
		}
	}
}