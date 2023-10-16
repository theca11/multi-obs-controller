import { AbstractStatefulRequestAction } from '../BaseRequestAction';
import { SocketSettings } from '../types';
import { StateEnum } from '../StateEnum';
import { getProfilesLists } from '../lists';
import { SingleRequestPayload } from '../types';
import { sockets } from '../../plugin/sockets';

type ActionSettings = { profileName: string }

export class SetProfileAction extends AbstractStatefulRequestAction<ActionSettings, 'CurrentProfileChanged'> {
	currentProfileName = new Array(sockets.length).fill(null);

	constructor() {
		super('dev.theca11.multiobs.setprofile', { titleParam: 'profileName', statusEvent: 'CurrentProfileChanged' });

		sockets.forEach((socket, socketIdx) => {
			socket.on('CurrentProfileChanged', ({ profileName }) => {
				this.currentProfileName[socketIdx] = profileName;
			});
		});
	}

	getPayloadFromSettings(settings: Record<string, never> | Partial<ActionSettings>): SingleRequestPayload<'SetCurrentProfile'> {
		const { profileName } = settings;
		return {
			requestType: 'SetCurrentProfile',
			requestData: { profileName: profileName },
		};
	}

	override async onPropertyInspectorReady({ context, action }: { context: string, action: string }) {
		const profilesLists = await getProfilesLists();
		const payload = { event: 'ProfileListLoaded', profilesLists: profilesLists };
		$SD.sendToPropertyInspector(context, payload, action);
	}

	override async onSocketConnected(socketIdx: number): Promise<void> {
		try {
			const { currentProfileName } = await sockets[socketIdx].call('GetProfileList');
			this.currentProfileName[socketIdx] = currentProfileName;
		}
		catch {
			this.currentProfileName[socketIdx] = null;
		}
	}

	override async onSocketDisconnected(socketIdx: number): Promise<void> {
		this.currentProfileName[socketIdx] = null;
	}

	async fetchState(socketSettings: NonNullable<SocketSettings<ActionSettings>>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Intermediate | StateEnum.Inactive> {
		if (!socketSettings.profileName) return StateEnum.Inactive;
		return socketSettings.profileName === this.currentProfileName[socketIdx] ? StateEnum.Active : StateEnum.Inactive;
	}

	async shouldUpdateState(evtData: { profileName: string; }, socketSettings: SocketSettings<ActionSettings>): Promise<boolean> {
		return socketSettings.profileName ? true : false;
	}

	getStateFromEvent(evtData: { profileName: string; }, socketSettings: SocketSettings<ActionSettings>): StateEnum {
		return evtData.profileName === socketSettings.profileName ? StateEnum.Active : StateEnum.Inactive;
	}
}