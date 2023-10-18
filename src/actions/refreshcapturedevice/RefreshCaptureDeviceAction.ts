import { AbstractStatelessRequestAction } from '../BaseRequestAction';
import { BatchRequestPayload } from '../types';

type ActionSettings = { deviceName: string, sleepMs: string }

export class RefreshCaptureDeviceAction extends AbstractStatelessRequestAction<ActionSettings> {
	constructor() {
		super('dev.theca11.multiobs.refreshcapturedevice', { titleParam: 'deviceName' });
	}

	getPayloadFromSettings(socketIdx: number, settings: Record<string, never> | Partial<ActionSettings>): BatchRequestPayload {
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
