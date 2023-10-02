import { sockets } from '../../plugin/sockets';
import { clamp } from '../../plugin/utils';
import { AbstractStatelessAction } from '../BaseWsAction';
import { fetchStats } from '../states';
import { DidReceiveSettingsData, PersistentSettings, WillAppearData, WillDisappearData } from '../types';

type StatConfig = { target: number, stat: string, color: string }

export class StatsAction extends AbstractStatelessAction {

	private _ctxStatsSettings = new Map<string, StatConfig[]>();
	private first_encoded = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_skipped = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_rendered = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_lagged = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_total = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_dropped = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);

	private _statsUpdateInterval: NodeJS.Timeout | null = null;

	_generalStats = new Array(sockets.length).fill(null);
	_streamStats = new Array(sockets.length).fill(null);
	_recordStats = new Array(sockets.length).fill(null);

	constructor() {
		super('dev.theca11.multiobs.stats');

		this.onWillAppear(async ({ context, payload }: WillAppearData<PersistentSettings>) => {
			this._ctxStatsSettings.set(context, this.formatStatSettings(payload.settings));
			if (this._ctxStatsSettings.size === 1 && !this._statsUpdateInterval) {
				[this._generalStats, this._streamStats, this._recordStats] = await fetchStats();
				this._statsUpdateInterval = setInterval(async () => {
					[this._generalStats, this._streamStats, this._recordStats] = await fetchStats();
					this.updateImages();
				}, 2000);
			}
			this.updateKeyImage(context);
		});

		this.onWillDisappear(async ({ context }: WillDisappearData<PersistentSettings>) => {
			this._ctxStatsSettings.delete(context);
			if (this._ctxStatsSettings.size === 0 && this._statsUpdateInterval) {
				clearInterval(this._statsUpdateInterval);
				this._statsUpdateInterval = null;
			}
		});

		this.onDidReceiveSettings(({ context, payload }: DidReceiveSettingsData<PersistentSettings>) => {
			this._ctxStatsSettings.set(context, this.formatStatSettings(payload.settings));
			this.updateKeyImage(context);
		});

		this.onLongPress(() => {
			this.resetStats();
		});
	}

	resetStats() {
		// Reset stats from skipped/dropped frames
		this.first_encoded = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this.first_skipped = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this.first_rendered = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this.first_lagged = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this.first_total = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
		this.first_dropped = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	}

	getFontSizeToFit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
		ctx.font = 'bold 1pt Arial';
		return maxWidth / ctx.measureText(text).width;
	}

	override async getForegroundImage(context: string) {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.globalCompositeOperation = 'source-over';

		canvas.width = 144;
		canvas.height = 144;

		const statsArr = this._ctxStatsSettings.get(context);
		if (!statsArr) return;

		// Text
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'center';
		const yPad = 5;
		const yStep = (canvas.height - 2 * yPad) / (statsArr.length);
		let lastTarget = 1;
		for (const [idx, { target, stat, color }] of statsArr.entries()) {
			// Target separating line
			if (target !== lastTarget && idx !== 0) {
				ctx.save();
				ctx.strokeStyle = '#ffffff';
				ctx.lineWidth = 2;
				// ctx.setLineDash([20, 11]);
				ctx.beginPath();
				ctx.moveTo(0, yStep * idx + yPad + 0.5);
				ctx.lineTo(canvas.width, yStep * idx + yPad + 0.5);
				ctx.stroke();
				ctx.restore();
			}
			lastTarget = target;

			const yPos = yStep * (idx) + yStep / 2 + yPad;
			const text = this.getStatString(target - 1, stat) || '-';
			ctx.save();
			// Adjust size dynamically
			const fontHeightLimit = Math.floor(clamp(canvas.height / statsArr.length - 11, 16, 34));
			ctx.font = 'bold 1pt Arial';
			const fontWidthLimit = Math.floor((canvas.width - 10) / ctx.measureText(text).width);
			const fontSize = Math.min(fontWidthLimit, fontHeightLimit);
			ctx.font = `bold ${fontSize}pt Arial`;

			ctx.fillStyle = color;
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 2;
			ctx.lineJoin = 'round';
			ctx.strokeText(text, canvas.width / 2 + 0.5, yPos, canvas.width - 10);
			ctx.fillText(text, canvas.width / 2 + 0.5, yPos, canvas.width - 10);
			ctx.restore();
		}

		return canvas;
	}

	formatStatSettings(actionSettings: PersistentSettings): StatConfig[] {
		const settingsArray = this.getSettingsArray(actionSettings);
		const formattedStatsArray = settingsArray.flatMap((settings, socketIdx) => {
			if (!settings) return [];
			let { stats, colors } = settings as { stats: string | string[], colors: string | string[] };
			if (!stats) return [];
			if (!Array.isArray(stats)) stats = [stats];
			if (!Array.isArray(colors)) colors = [colors];
			const statObjArray: StatConfig[] = [];
			for (let i = 0; i < stats.length; i++) {
				statObjArray.push({ target: socketIdx + 1, stat: stats[i], color: colors[i] });
			}
			return statObjArray;
		}).filter(item => item !== null);
		return formattedStatsArray;
	}

	getStatString(socketIdx: number, statName: string): string {
		const [group, name] = statName.split('.');
		if (group === 'general') {
			const groupStats = this._generalStats[socketIdx];
			if (!groupStats) return '';
			if (name === 'cpuUsage') return groupStats[name].toFixed(1) + '%';
			if (name === 'memoryUsage') return (groupStats[name] * 1024 * 1024 / 1024.01 / 1024.01).toFixed(1) + ' MB';
			if (name === 'availableDiskSpace') {
				const bytes = groupStats[name] * 1024 * 1024;
				if (bytes > 1024 * 1024 * 1024 * 1024) return (bytes / 1024.01 / 1024.01 / 1024.01 / 1024.01).toFixed(1) + ' TB';
				if (bytes > 1024 * 1024 * 1024) return (bytes / 1024.01 / 1024.01 / 1024.01).toFixed(1) + ' GB';
				else return (bytes / 1024.01 / 1024.01).toFixed(1) + ' MB';
			}
			if (name === 'activeFps') return groupStats[name].toFixed(0) + ' FPS';
			if (name === 'averageFrameRenderTime') return groupStats[name].toFixed(1) + ' ms';
			if (name === 'renderSkippedFrames') {
				let skipped = groupStats['renderSkippedFrames'];
				let total = groupStats['renderTotalFrames'];

				if (total < this.first_rendered[socketIdx] || skipped < this.first_lagged[socketIdx]) {
					this.first_rendered[socketIdx] = total;
					this.first_lagged[socketIdx] = skipped;
				}
				total -= this.first_rendered[socketIdx];
				skipped -= this.first_lagged[socketIdx];

				const percentage = total ? (skipped / total) * 100 : 0.01;
				return `${skipped} (${percentage.toFixed(1)}%)`;
			}
			if (name === 'outputSkippedFrames') {
				let skipped = groupStats['outputSkippedFrames'];
				let total = groupStats['outputTotalFrames'];

				if (total < this.first_encoded[socketIdx] || skipped < this.first_skipped[socketIdx]) {
					this.first_encoded[socketIdx] = total;
					this.first_skipped[socketIdx] = skipped;
				}
				total -= this.first_encoded[socketIdx];
				skipped -= this.first_skipped[socketIdx];

				const percentage = total ? (skipped / total) * 100 : 0.01;
				return `${skipped} (${percentage.toFixed(1)}%)`;
			}
		}
		else if (group === 'stream') {
			const groupStats = this._streamStats[socketIdx];
			if (!groupStats) return '';
			if (name === 'outputActive') return groupStats['outputReconnecting'] ? 'Reconnecting' : groupStats['outputActive'] ? 'Active' : 'Inactive';
			if (name === 'outputSkippedFrames') {
				let skipped = groupStats['outputSkippedFrames'];
				let total = groupStats['outputTotalFrames'];

				if (total < this.first_total[socketIdx] || skipped < this.first_dropped[socketIdx]) {
					this.first_total[socketIdx] = total;
					this.first_dropped[socketIdx] = skipped;
				}
				total -= this.first_total[socketIdx];
				skipped -= this.first_dropped[socketIdx];

				const percentage = total ? (skipped / total) * 100 : 0.01;
				return `${skipped} (${percentage.toFixed(1)}%)`;
			}
		}
		else if (group === 'record') {
			const groupStats = this._recordStats[socketIdx];
			if (!groupStats) return '';
			if (name === 'outputActive') return groupStats['outputPaused'] ? 'Paused' : groupStats['outputActive'] ? 'Active' : 'Inactive';
		}
		return '';
	}
}