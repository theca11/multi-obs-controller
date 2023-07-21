export class SDUtils {
	/**
	 * Set key title, wrapped in a maximum of 2 lines of aprox. 9 characters each
	 * @param {string} context Action context
	 * @param {string} title Title to set
	 * @param {string} target HW/SW target
	 */
	static setKeyTitle(context, title, target = 0) {
		title = String(title ?? '');

		const maxLines = 2;
		const maxWidth = 9;
		// Assume spaces are a bit smaller than a full character
		const space_width = 2/3;

		const parts = title.split(" ");
		let part = 0;
		let lines = [];
		for (let line = 0; line < maxLines && part < parts.length; ++line){
			let line = [];
			let length = 0;
			let total_len = 0;
			while(total_len < maxWidth && part < parts.length){
				if(length > 0 && total_len + space_width + parts[part].length > maxWidth){
					break;
				}
				line.push(parts[part]);
				length += parts[part].length;
				part++;
				total_len = length + (line.length - 1) * space_width;
			}
			lines.push(line.join(" "));
		}
		title = lines.join("\n");

		$SD.setTitle(context, title, target);
	}

	/**
	 * Log message to both console and SD log file
	 * @param {string} message Message to log
	 */
	static log(message) {
		console.log(message);
		$SD.logMessage(message);
	}
}