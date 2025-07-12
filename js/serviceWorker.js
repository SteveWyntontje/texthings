// Handle a click to the toolbar icon
chrome.action.onClicked.addListener(async (tab) => {
	const enabled = await get_option('enabled');
	if (enabled) {
		chrome.action.setIcon({
			path: {
				"38": "../img/browser-disabled38.png",
				"19": "../img/browser-disabled19.png"
			}
		});
		await set_option('enabled', false);
	} else {
		chrome.action.setIcon({
			path: {
				"38": "../img/browser38.png",
				"19": "../img/browser19.png"
			}
		});
		await set_option('enabled', true);
	}
});

// Respond to requests from other scripts
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
	if (request.method === 'shouldTeXify') {
		const answer = await should_texify(request.host);
		const delimiters = await get_delimiters();
		const skip_tags = await get_skip_tags();
		const ignore_class = await get_ignore_class();
		const process_class = await get_process_class();
		sendResponse({
			answer,
			delimiters,
			skip_tags,
			ignore_class,
			process_class
		});
	} else {
		sendResponse({});
	}
	return true; // Needed for async sendResponse
});

// Use declarativeNetRequest to modify CSP headers
chrome.declarativeNetRequest.updateDynamicRules({
	removeRuleIds: [1],
	addRules: [{
		id: 1,
		priority: 1,
		action: {
			type: "modifyHeaders",
			responseHeaders: [
				{
					header: "Content-Security-Policy",
					operation: "append",
					value: "script-src https://cdnjs.cloudflare.com; font-src https://cdnjs.cloudflare.com"
				}
			]
		},
		condition: {
			urlFilter: "|<all_urls>",
			resourceTypes: ["main_frame", "sub_frame"]
		}
	}]
});

// --- Helper functions ---

async function should_texify(host) {
	const enabled = await get_option('enabled');
	if (!enabled) return false;
	const sites = await get_option('sites');
	const matches = host_matches(host, sites);
	const white_list_mode = await get_option('white_list_mode');
	return (white_list_mode === matches);
}

function host_matches(host, domain_list) {
	for (let i = 0; i < domain_list.length; i++) {
		if (host.indexOf(domain_list[i]) >= 0) {
			return true;
		}
	}
	return false;
}

function get_hostname(url) {
	try {
		return new URL(url).hostname;
	} catch {
		return '';
	}
}

async function get_delimiters() {
	return {
		inline_dollar: await get_option('inline_dollar'),
		inline_bracket: await get_option('inline_bracket'),
		inline_custom: await get_option('inline_custom'),
		display_dollar: await get_option('display_dollar'),
		display_bracket: await get_option('display_bracket'),
		display_custom: await get_option('display_custom')
	};
}

async function get_skip_tags() {
	return await get_option('skip_tags');
}

async function get_ignore_class() {
	return await get_option('ignore_class');
}

async function get_process_class() {
	return await get_option('process_class');
}

chrome.alarms.create('keepAlive', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === 'keepAlive') {
		// This will wake up the service worker, but do minimal work here
		// You can log or perform lightweight tasks if needed
		console.log('Service worker kept alive');
	}
});


// originally options.js

var default_options = {
	enabled: true,
	white_list_mode: false,
	sites: [],
	inline_dollar: true,
	inline_bracket: true,
	inline_custom: false,
	display_dollar: true,
	display_bracket: true,
	display_custom: false,
	ignore_class: false,
	process_class: false,
	skip_tags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
};

function get_option(option_name) {
	for (var option in default_options) {
		if (!(option in chrome.storage.local)) {
			chrome.storage.local[option] = JSON.stringify(default_options[option]);
		}
	}

	if (option_allowed(option_name)) {
		return JSON.parse(chrome.storage.local[option_name]);
	} else {
		throw "Option " + option_name + " not supported";
	}
}

function set_option(option_name, value) {
	if (option_allowed(option_name)) {
		chrome.storage.local[option_name] = JSON.stringify(value);
	} else {
		throw "Option " + option_name + " not supported";
	}
}

function option_allowed(option_name) {
	return (option_name in default_options);
}

function get_default_option(option_name) {
	if (option_allowed(option_name)) {
		return default_options[option_name];
	} else {
		throw "Option " + option_name + " not supported";
	}
}
