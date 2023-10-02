export class FormUtils {
	/**
	 * Returns the value from a form using the form controls name property
	 * @param {Element | string} form
	 * @returns
	 */
	static getFormValue(form) {
		if (typeof form === 'string') {
			form = document.querySelector(form);
		}

		const elements = form?.elements;

		if (!elements) {
			console.error('Could not find form!');
		}

		const formData = new FormData(form);
		const formValue = {};

		formData.forEach((value, key) => {
			if (!Reflect.has(formValue, key)) {
				formValue[key] = value;
				return;
			}
			if (!Array.isArray(formValue[key])) {
				formValue[key] = [formValue[key]];
			}
			formValue[key].push(value);
		});

		// Remove keys with empty values
		for (const key of Object.keys(formValue)) {
			if (formValue[key] === '') delete formValue[key];
		}

		return formValue;
	}

	/**
	 * Sets the value of form controls using their name attribute and the jsn object key
	 * @param {*} jsn
	 * @param {Element | string} form
	 */
	static setFormValue(jsn, form) {
		if (!jsn) {
			return;
		}

		if (typeof form === 'string') {
			form = document.querySelector(form);
		}

		const elements = form?.elements;

		if (!elements) {
			console.error('Could not find form!');
		}

		Array.from(elements)
		.filter((element) => element?.name)
		.forEach((element) => {
			const { name, type } = element;
			const value = name in jsn ? jsn[name] : null;
			const isCheckOrRadio = type === 'checkbox' || type === 'radio';

			if (value === null) return;

			if (isCheckOrRadio) {
				const isSingle = value === element.value;
				if (isSingle || (Array.isArray(value) && value.includes(element.value))) {
					element.checked = true;
				}
			}
			else if (Array.isArray(value)) {
				element.value = value.length > 0 ? value[0] : '';
				element.value = value.shift() ?? '';
				jsn = { ...jsn, [name]: value };
			}
			else {
				element.value = value ?? '';
			}
		});
	}
}
