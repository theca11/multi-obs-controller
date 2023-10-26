import { AbstractStatelessRequestAction } from '../BaseRequestAction';
import { getInputsLists } from '../lists';
import { Input, SingleRequestPayload } from '../types';

type ActionSettings = { sourceName: string }

export class RefreshBrowserSourceAction extends AbstractStatelessRequestAction<ActionSettings> {
	constructor() {
		super('dev.theca11.multiobs.refreshbrowsersource', { titleParam: 'sourceName' });
	}

	override getPayloadFromSettings(socketIdx: number, settings: Record<string, never> | Partial<ActionSettings>): SingleRequestPayload<'PressInputPropertiesButton'> {
		const { sourceName } = settings;
		return {
			requestType: 'PressInputPropertiesButton',
			requestData: { inputName: sourceName, propertyName: 'refreshnocache' },
		};
	}

	override async onPropertyInspectorReady({ context, action }: { context: string; action: string; }): Promise<void> {
		const inputsLists = await getInputsLists() as Input[][];
		const payload = {
			event: 'InputListLoaded',
			inputsLists: inputsLists.map((list) =>
				list.filter((i) => ['browser_source'].includes(i.unversionedInputKind)),
			),
		};
		$SD.sendToPropertyInspector(context, payload, action);
	}
}
