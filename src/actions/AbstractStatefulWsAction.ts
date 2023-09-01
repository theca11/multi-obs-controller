import { AbstractBaseWsAction, StateEnum } from './AbstractBaseWsAction';
import { evtEmitter } from './states';
import { ConstructorParams, PartiallyRequired } from './types';

export abstract class AbstractStatefulWsAction extends AbstractBaseWsAction {

	constructor(UUID: string, params: PartiallyRequired<ConstructorParams, 'statusEvent'>) {
		super(UUID, params);
		this._showSuccess = false;	// success is already shown via state updates

		// Attach listener to status event to update key image
		const { statusEvent } = params;
		evtEmitter.on(statusEvent, async (evtSocketIdx, evtData) => {
			const img = await this.getDefaultKeyImage();
			for (const [context, settings] of this._ctxSettingsCache) {
				try {
					const socketSettings = this.getSettingsArray(settings)[evtSocketIdx];
					if (socketSettings && this._ctxStatesCache.has(context) && await this.shouldUpdateState(evtData, socketSettings, evtSocketIdx)) {
						const newState = await this.getStateFromEvent(evtData, socketSettings);
						const prevStates = this._ctxStatesCache.get(context) as StateEnum[];
						prevStates[evtSocketIdx] = newState;
						this._updateStates(context, prevStates);
						this.updateKeyImage(context, this.getTarget(settings), img);
					}
				}
				catch (e) {
					console.error(`Error getting state from event: ${e}`);
				}
			}
		});
	}

	abstract fetchState(socketSettings: Record<string, any>, socketIdx: number): Promise<StateEnum.Active | StateEnum.Inactive>;

	/**
	 * Whether a received event should trigger an state update an action
	 * @param evtData Event data
	 * @param socketSettings Action settings for the corresponding socket
	 * @param socketIdx Socket index
	 */
	abstract shouldUpdateState(evtData: any, socketSettings: any, socketIdx: number): Promise<boolean>;

	/**
	 * Get state associated with the action from the event that notifies a state update
	 * @param evtData Event data
	 * @param socketSettings Action settings for the corresponding socket
	 * @returns New true/false state
	 */
	abstract getStateFromEvent(evtData: Record<string, any>, socketSettings: Record<string, any>): Promise<StateEnum>;
}