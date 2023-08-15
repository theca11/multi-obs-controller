import { AbstractBaseWsAction, StateEnum } from "./AbstractBaseWsAction";

export abstract class AbstractStatelessWsAction extends AbstractBaseWsAction {

	async fetchState(socketSettings: Record<string, any>, socketIdx: number): Promise<StateEnum> {
		return StateEnum.None;
	}
}