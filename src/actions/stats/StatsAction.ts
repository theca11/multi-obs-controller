import { sockets } from '../../plugin/sockets';
import { clamp } from '../../plugin/utils';
import { ExtendedAction } from '../ExtendedAction';
import { generalStats, streamStats, recordStats } from '../states';
import { DidReceiveSettingsData, PersistentSettings, WillAppearData, WillDisappearData } from '../types';

type StatObj = { target: number, stat: string, color: string }

export class StatsAction extends ExtendedAction {

	private _ctxSettingsCache = new Map<string, StatObj[]>();
	private first_encoded = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_skipped = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_rendered = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_lagged = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_total = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);
	private first_dropped = new Array(sockets.length).fill(Number.MAX_SAFE_INTEGER);

	constructor() {
		super('dev.theca11.multiobs.stats');

		this.onWillAppear(async ({ context, payload }: WillAppearData<PersistentSettings>) => {
			this._ctxSettingsCache.set(context, this.formatStatSettings(payload.settings));
			this.updateImages();
		});

		this.onWillDisappear(async ({ context }: WillDisappearData<PersistentSettings>) => {
			this._ctxSettingsCache.delete(context);
		});

		this.onDidReceiveSettings(({ context, payload }: DidReceiveSettingsData<PersistentSettings>) => {
			this._ctxSettingsCache.set(context, this.formatStatSettings(payload.settings));
			this.updateImages();
		});

		this.onLongPress(() => {
			this.resetStats();
		});

		setInterval(async () => {
			// to-do: only fetch and update if there are action contexts
			this.updateImages();
		}, 2000);
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

	updateImages() {
		for (const [context] of this._ctxSettingsCache) {

			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			ctx.globalCompositeOperation = 'source-over';

			canvas.width = 144;
			canvas.height = 144;

			const statsArr = this._ctxSettingsCache.get(context);
			if (!statsArr) return;

			// Background color
			ctx.fillStyle = '#517a96';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

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

			const b64 = canvas.toDataURL('image/png', 1);
			$SD.setImage(context, b64);
		}
	}

	formatStatSettings(actionSettings: PersistentSettings): StatObj[] {
		const settingsArray = this.getSettingsArray(actionSettings);
		const formattedStatsArray = settingsArray.flatMap((settings, socketIdx) => {
			if (!settings) return [];
			let { stats, colors } = settings as { stats: string | string[], colors: string | string[] };
			if (!stats) return [];
			if (!Array.isArray(stats)) stats = [stats];
			if (!Array.isArray(colors)) colors = [colors];
			const statObjArray: StatObj[] = [];
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
			const groupStats = generalStats[socketIdx];
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
			const groupStats = streamStats[socketIdx];
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
			const groupStats = recordStats[socketIdx];
			if (!groupStats) return '';
			if (name === 'outputActive') return groupStats['outputPaused'] ? 'Paused' : groupStats['outputActive'] ? 'Active' : 'Inactive';
		}
		return '';
	}


	// -- General helpers --
	getCommonSettings(settings: PersistentSettings) {
		settings = settings ?? {};
		return {
			target: parseInt(settings.common?.target || '0'),
			indivParams: !!settings.common?.indivParams,
		};
	}

	getTarget(settings: PersistentSettings): number {
		return this.getCommonSettings(settings).target;
	}

	getSettingsArray(settings: PersistentSettings) {
		settings = settings ?? {};
		const { target, indivParams } = this.getCommonSettings(settings);
		const settingsArray = [];
		for (let i = 0; i < sockets.length; i++) {
			if (target === 0 || target === i + 1) {
				settingsArray.push(settings[`params${(target === 0 && !indivParams) ? 1 : i + 1}`] ?? {});
			}
			else {
				settingsArray.push(null);
			}
		}
		return settingsArray;
	}
}