import { AbstractStatelessRequestAction } from '../BaseRequestAction';
import { BatchRequestPayload } from '../types.js';

type ActionSettings = { deviceName: string, sleepMs: string }

export class RefreshCaptureDeviceAction extends AbstractStatelessRequestAction<ActionSettings> {
	constructor() {
		super('dev.theca11.multiobs.refreshcapturedevice', { titleParam: 'deviceName' });
	}

	getPayloadFromSettings(settings: Partial<ActionSettings> | Record<string, never>): BatchRequestPayload {
		const { deviceName, sleepMs } = settings;
		return {
			requests: [
				{
					requestType: 'PressInputPropertiesButton',
					requestData: { inputName: deviceName, propertyName: 'activate' },
				},
				{ requestType: 'Sleep', requestData: { sleepMillis: Number(sleepMs) } },
				{
					requestType: 'PressInputPropertiesButton',
					requestData: { inputName: deviceName, propertyName: 'activate' },
				},
			],
			options: {
				haltOnFailure: true,
			},
		};
	}
}
