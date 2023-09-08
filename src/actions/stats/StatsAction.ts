import { sockets } from '../../plugin/sockets';
import { DidReceiveSettingsData, WillAppearData, WillDisappearData } from '../types';

export class StatsAction extends Action {

	private _ctxCache = new Set<string>();
	private _historicStats: any[] = [];

	constructor() {
		super('dev.theca11.multiobs.stats');

		this.onWillAppear(async ({ context }: WillAppearData<unknown>) => {
			this._ctxCache.add(context);
		});

		this.onWillDisappear(async ({ context }: WillDisappearData<unknown>) => {
			this._ctxCache.delete(context);
		});

		this.onDidReceiveSettings(({ payload }: DidReceiveSettingsData<unknown>) => {
			console.log(payload.settings);
		});

		setInterval(async () => {
			// console.log('updating stats');
			await this._fetchStats();
			this.updateImages();
		}, 2000);
	}

	async _fetchStats() {
		const callResults = await Promise.allSettled(sockets.map(s =>
			s.isConnected ? s.call('GetStats') : Promise.reject(),
		));

		const stats = callResults.map(res => res.status === 'fulfilled' ? res.value : null);

		this._historicStats.push(stats);
		if (this._historicStats.length > 10) this._historicStats.shift();
		// console.log(this._historicStats);
	}

	updateImages() {
		for (const context of this._ctxCache) {

			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			ctx.globalCompositeOperation = 'source-over';

			canvas.width = 144;
			canvas.height = 144;

			for (let i = 0; i < sockets.length; i++) {
				const xOffset = i * canvas.width / sockets.length;
				ctx.fillStyle = '#efefef';
				ctx.strokeStyle = '#efefef';
				ctx.font = 'bold 25px Arial';
				ctx.textBaseline = 'middle';
			}

			const b64 = canvas.toDataURL('image/png', 1);
			$SD.setImage(context, b64);
		}
	}

	// plot(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
	// 	const xStep = (canvas.width - 10) / 10;

	// 	const cpuUsageHistory = this._historicStats.map(stats => stats[0] ? stats[0].cpuUsage : null);

	// 	ctx.save();
	// 	ctx.transform(0, 0, 0, -1, 5, canvas.height - 5);

	// 	const plotUpperY = canvas.height - 5;
	// 	const plotLowerY = 5;

	// 	ctx.beginPath();
	// 	// ctx.moveTo(5, canvas.height - 5);

	// 	const maxData = cpuUsageHistory.sort().at(-1);
	// 	for (const [idx, data] of cpuUsageHistory.entries()) {
	// 		ctx.lineTo(xStep * idx, data / maxData * (plotUpperY - plotLowerY));
	// 	}
	// 	ctx.stroke();

	// 	ctx.restore();
	// }
}