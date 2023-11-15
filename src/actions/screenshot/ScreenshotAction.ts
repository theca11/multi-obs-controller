import { sockets } from '../../plugin/sockets';
import { AbstractStatelessRequestAction } from '../BaseRequestAction';
import { SingleRequestPayload } from '../types';

type ActionSettings = { screenshotTarget: string, quality: string }

export class ScreenshotAction extends AbstractStatelessRequestAction<ActionSettings> {
	private _outputFolder = new Array(sockets.length).fill(null);
	private _currentSceneName = new Array(sockets.length).fill('');

	constructor() {
		super('dev.theca11.multiobs.screenshot', { titleParam: 'screenshotTarget' });

		sockets.forEach((socket, socketIdx) => {
			socket.on('CurrentProgramSceneChanged', ({ sceneName }) => {
				this._currentSceneName[socketIdx] = sceneName;
			});
		});
	}

	override getPayloadFromSettings(socketIdx: number, settings: Record<string, never> | Partial<ActionSettings>): SingleRequestPayload<'SaveSourceScreenshot'> {
		const { screenshotTarget, quality } = settings;
		return {
			requestType: 'SaveSourceScreenshot',
			requestData: {
				sourceName: screenshotTarget?.toLocaleLowerCase() === 'output' ? this._currentSceneName[socketIdx] : screenshotTarget,
				imageFormat: 'png',
				imageCompressionQuality: parseInt(quality ?? '75'),
				imageFilePath: `${this._outputFolder[socketIdx]}\\Screenshot_OBS${socketIdx + 1} ${new Date().toLocaleString('sv-SE').replace(/:/g, '-')}.png`,
			},
		};
	}

	override async onSocketConnected(socketIdx: number): Promise<void> {
		const { recordDirectory } = await sockets[socketIdx].call('GetRecordDirectory');
		this._outputFolder[socketIdx] = recordDirectory;
		const { currentProgramSceneName } = await sockets[socketIdx].call('GetCurrentProgramScene');
		this._currentSceneName[socketIdx] = currentProgramSceneName;
	}
}
