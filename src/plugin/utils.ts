export class SDUtils {
	/**
	 * Set key title, wrapped in a maximum of 2 lines of aprox. 9 characters each
	 * @param context Action context
	 * @param title Title to set
	 * @param target HW/SW target
	 */
	static setKeyTitle(context: string, title: string, target = 0) {
		title = String(title ?? '');

		const maxLines = 2;
		const maxWidth = 9;
		// Assume spaces are a bit smaller than a full character
		const space_width = 2 / 3;

		const parts = title.split(' ');
		let part = 0;
		const lines = [];
		for (let lineNum = 0; lineNum < maxLines && part < parts.length; ++lineNum) {
			const line = [];
			let length = 0;
			let total_len = 0;
			while (total_len < maxWidth && part < parts.length) {
				if (length > 0 && total_len + space_width + parts[part].length > maxWidth) {
					break;
				}
				line.push(parts[part]);
				length += parts[part].length;
				part++;
				total_len = length + (line.length - 1) * space_width;
			}
			lines.push(line.join(' '));
		}
		title = lines.join('\n');

		$SD.setTitle(context, title, target);
	}

	// Aux object to define console log levels
	static consoleLog = {
		'error': (msg: string) => console.error(msg),
		'warn': (msg: string) => console.warn(msg),
		'info': (msg: string) => console.info(msg),
		'log': (msg: string) => console.log(msg),
	};

	/**
	 * Log message to both console and SD log file
	 * @param message Message to log
	 */
	static log(message: string, logLevel: 'error' | 'warn' | 'info' | 'log' = 'info') {
		message = `[${logLevel.toUpperCase()}]${message.startsWith('[') ? '' : ' '}` + message;
		SDUtils.consoleLog[logLevel](message);
		$SD.logMessage(message);
	}

	/**
	 * Log error message to both console and SD log file
	 * @param message Error message to log
	 */
	static logError(message: string) {
		SDUtils.log(message, 'error');
	}
}

export class ImageUtils {
	/**
	 * Load an image into an Image() element
	 * @param url Image url
	 * @returns Promise that resolves on successful load, and rejects on load error
	 */
	static loadImagePromise(url: string): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = () => reject();
			img.src = url;
		});
	}
}

export class CanvasUtils {
	static drawColorRect(
		ctx: CanvasRenderingContext2D,
		color: string,
		xStart: number, xEnd: number,
		compOp: GlobalCompositeOperation = 'source-over',
		canvasWidth = 144, canvasHeight = 144,
	) {
		ctx.globalCompositeOperation = compOp;
		ctx.fillStyle = color;
		ctx.fillRect(xStart * canvasWidth, 0, xEnd * canvasWidth, canvasHeight);
	}

	static drawLineHPatternRect(
		ctx: CanvasRenderingContext2D,
		xStart: number, xEnd: number,
		color1 = '#33333366', color2 = '#66666666',
		numLines = 15,
		compOp: GlobalCompositeOperation = 'source-over',
		canvasWidth = 144, canvasHeight = 144,
	) {
		ctx.globalCompositeOperation = compOp;
		const thickness = canvasHeight / numLines;
		for (let i = 0; i < numLines; i++) {
			ctx.beginPath();
			ctx.strokeStyle = i % 2 ? color1 : color2;
			ctx.lineWidth = thickness;
			ctx.moveTo(xStart * canvasWidth, (i + 1 / 2) * thickness);
			ctx.lineTo(xEnd * canvasWidth, (i + 1 / 2) * thickness);
			ctx.stroke();
		}
	}

	static drawLineVPatternRect(ctx: CanvasRenderingContext2D,
		xStart: number, xEnd: number,
		color1 = '#33333366', color2 = '#66666666',
		numLines = 16,
		compOp: GlobalCompositeOperation = 'source-over',
		canvasWidth = 144, canvasHeight = 144,
	) {
		ctx.globalCompositeOperation = compOp;
		const thickness = canvasWidth / numLines;
		numLines = numLines * (xEnd - xStart);
		for (let i = 0; i < numLines; i++) {
			ctx.beginPath();
			ctx.strokeStyle = i % 2 ? color1 : color2;
			ctx.lineWidth = thickness;
			ctx.moveTo(xStart * canvasWidth + (i + 1 / 2) * thickness, 0);
			ctx.lineTo(xStart * canvasWidth + (i + 1 / 2) * thickness, canvasHeight);
			ctx.stroke();
		}
	}
}

export function clamp(val: number, min: number, max: number) {
	return Math.min(Math.max(val, min), max);
}

export function secondsToTimecode(seconds: number): string {
	return [
		seconds / 60 / 60,	// hours
		seconds / 60 % 60,	// minutes
		seconds % 60,		// seconds
	]
	.map(n => Math.floor(n).toString().padStart(2, '0'))
	.join(':');
}