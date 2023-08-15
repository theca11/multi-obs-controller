import { AbstractStatelessWsAction } from '../AbstractStatelessWsAction';

export class RefreshCaptureDeviceAction extends AbstractStatelessWsAction {
	constructor() {
		super('dev.theca11.multiobs.refreshcapturedevice', { titleParam: 'deviceName' });
	}

	getPayloadFromSettings(settings: any) { 
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
				haltOnFailure: true
			}
		};
	}
}
