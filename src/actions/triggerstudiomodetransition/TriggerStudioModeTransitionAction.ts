import { AbstractStatelessRequestAction } from '../BaseRequestAction';
import { SingleRequestPayload } from '../types';

type ActionSettings = Record<string, never>

export class TriggerStudioModeTransitionAction extends AbstractStatelessRequestAction<ActionSettings> {
	constructor() {
		super('dev.theca11.multiobs.triggerstudiomodetransition');
	}

	override getPayloadFromSettings(): SingleRequestPayload<'TriggerStudioModeTransition'> {
		return { requestType: 'TriggerStudioModeTransition' };
	}
}
