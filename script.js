const DISCOVERY_DOC = "https://sheets.googleapis.com/$discovery/rest?version=v4",
	DISCOVERY_DOC_DRIVE = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
	SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.metadata.readonly",
	RANGE = `${SHEET_NAME}!A2:${String.fromCharCode(65 + Math.max(DATE_COL, NAME_COL, URL_COL))}`,
	WATERMARK = new Image(),
	date = new Date(),
	month_input = document.getElementById("month_input"),
	month_div = document.getElementById("month_div"),
	authorize_button = document.getElementById("authorize_button"),
	selectall_button = document.getElementById("selectall_button"),
	selectnone_button = document.getElementById("selectnone_button"),
	togglecolor_button = document.getElementById("togglecolor_button"),
	controls_div = document.getElementById("controls"),
	opacity_range = document.getElementById("opacity_range"),
	main_container_div = document.getElementById("main_container"),
	content_div = document.getElementById("content");

let tokenClient,
	sheetResult,
	gapiInited = !1,
	gisInited = !1,
	fanarts = new Array(),
	watermark_invert = '';

WATERMARK.src = WATERMARK_SRC;
month_input.value = `${date.getFullYear()}-${("0" + (date.getMonth() + 1)).slice(-2)}`;

function gapiLoaded() {
	gapi.load("client", intializeGapiClient);
}
async function intializeGapiClient() {
	await gapi.client.init({
		apiKey: API_KEY,
		discoveryDocs: [DISCOVERY_DOC, DISCOVERY_DOC_DRIVE]
	})
	gapiInited = true;
	maybeEnableButtons();
}

function gisLoaded() {
	tokenClient = google.accounts.oauth2.initTokenClient({
		client_id: CLIENT_ID,
		scope: SCOPES,
		callback: ""
	});
	gisInited = true;
	maybeEnableButtons();
}

function maybeEnableButtons() {
	gapiInited && gisInited && (authorize_button.hidden = false);
}

function handleAuthClick() {
	if(!sheetResult){
		tokenClient.callback = async (resp) => {
			if (resp.error !== undefined) {
				throw (resp);
			}
			authorize_button.innerText = "Aggiungi";
	
			await getSheet();
			getFanarts();
		};
	
		if (gapi.client.getToken() === null) {
			tokenClient.requestAccessToken({
				prompt: 'consent'
			});
		} else {
			tokenClient.requestAccessToken({
				prompt: ''
			});
		}
	} else getFanarts();
}

async function getLink(id) {
	let response;
	try {
		response = await gapi.client.drive.files.get({
			'fileId': id,
			'fields': 'webContentLink'
		});
	} catch (err) {
		console.log(err.message);
		return;
	}
	const files = response.result;
	if (!files || files.length == 0) {
		console.log("nessuna risposta");
		return;
	}
	return files['webContentLink'].split("&")[0];
}


async function getSheet() {
	let e;
	try {
		e = await gapi.client.sheets.spreadsheets.values.get({
			spreadsheetId: SPREADSHEET_ID,
			range: RANGE
		})
	} catch (e) {
		return void(content_div.innerText = e.message);
	}
	const t = e.result;
	if (!t || !t.values || 0 == t.values.length) return void(content_div.innerText = "No values found.");
	sheetResult = t.values;
}

async function getFanarts(){
	let date, date_str, id;
	for (x of sheetResult) {
		date = x[DATE_COL].split(" ")[0].split("/"); // dd/mm/yy hh.mm.ss
		date_str = `${date[2]}-${date[1]}`;

		if (date_str == month_input.value) { // yyyy-mm
			id = x[URL_COL].split("=")[1];
			fanarts.push({
				'id': id,
				'date': date,
				'name': x[NAME_COL],
				'content': await getLink(id),
				'enabled': 1
			})
		}
	}
	if (fanarts) {
		controls_div.hidden = false;
		updateOpacity();
		updateFanartList();
		//console.log(JSON.stringify(fanarts));
	}
}

function addCanvasEvents(img, canvas, ctx){
	function abc(e) {
		if (e.button == 0) addWatermark(e, img, canvas, ctx);
	}

	canvas.addEventListener('mousemove', abc);
	canvas.addEventListener('mousedown', function(e) {
		canvas.removeEventListener('mousemove', abc);
		canvas.addEventListener('mousedown', abc);
	});
}

function getNewCardHtml(element) {
	element.div = document.createElement("div");
	element.canvas = document.createElement("canvas");
	const div1 = document.createElement("div"),
		div2 = document.createElement("div"),
		a = document.createElement("a"),
		div3 = document.createElement("div"),
		div4 = document.createElement("div"),
		button1 = document.createElement("button"),
		button2 = document.createElement("button"),
		button3 = document.createElement("button"),
		button4 = document.createElement("button");
	
	element.div.className = `col-md-${BS_COL_WIDTH} entry${element.enabled == 0 ? " entry-disabled" : ""}`;
	element.div.id = `div-${element.id}`;
	element.div.setAttribute("data-index", element.index);
	div1.className = `card mb-${BS_COL_WIDTH} box-shadow my-card`;
	element.canvas.className = "card-img-top entry-img";
	element.canvas.id = element.id;
	element.canvas.setAttribute("data-name", element.name);
	element.canvas.setAttribute("data-content", element.content);
	div2.className = "card-body";
	a.className = "card-text";
	a.innerText = `${('0' + element.index).slice(-2)} - ${element.name}.png`;
	a.title = "Clicca per copiare."
	a.addEventListener("click", function() { navigator.clipboard.writeText(a.innerText); }, false)
	div3.className = "d-flex justify-content-between align-items-center card-controls";
	div4.className = "btn-group";

	button1.className = button2.className = button3.className = button4.className = "btn btn-sm btn-outline-secondary";
	button1.innerText = "⬅️";
	button2.innerText = "*️⃣";
	button3.innerText = "🔄";
	button4.innerText = "➡️";
	button1.addEventListener("click", function() { moveUpDown(element.id, -1); }, false);
	button2.addEventListener("click", function() { toggleEntry(element.id); }, false);
	button3.addEventListener("click", function() { reloadEntry(element.id); }, false);
	button4.addEventListener("click", function() { moveUpDown(element.id, 1); }, false);

	div4.appendChild(button1);
	div4.appendChild(button2);
	div4.appendChild(button3);
	div4.appendChild(button4);
	div3.appendChild(div4);
	div2.appendChild(a);
	div2.appendChild(div3);
	div1.appendChild(element.canvas);
	div1.appendChild(div2);
	element.div.appendChild(div1);

	const ctx = element.canvas.getContext("2d");

	element.image = new Image();
	element.image.addEventListener("load", function(){
		setBaseImage(element.image, element.canvas, ctx);
		addCanvasEvents(element.image, element.canvas, ctx);
	}, false);
	element.image.src = element.content;

	return element.div;
}

async function updateFanartList() {
	main_container_div.hidden = false;
	content_div.innerHTML = ""
	
	let i = 0;
	for (fanart of fanarts) {
		if(fanart.enabled){
			i++;
			fanart.index = i;
			content_div.appendChild(getNewCardHtml(fanart));
		}
	}

	for (fanart of fanarts) {
		if(!fanart.enabled){
			fanart.index = 0;
			content_div.appendChild(getNewCardHtml(fanart));
		}
	}
}

function getFanart(id){
	return fanarts.find(element => element.id == id)
}

function toggleEntry(id) {
	entry = getFanart(id);
	if (!entry) return;

	entry.enabled = !entry.enabled;
	updateFanartList()
}

function reloadEntry(id){
	const fanart = getFanart(id);
	if (!fanart) return;

	const old_div = fanart.div;
	content_div.replaceChild(getNewCardHtml(fanart), old_div);
	old_div.remove();
}

function selectAllNone(toggle) {
	fanarts.map(x => x.enabled = toggle)
	updateFanartList()
}

function debugFn(){
	fanarts = JSON.parse('[{"id":"1dE8L7w2DuOfQSJwf5oRjAeJ-VZfy5o-6","date":["03","08","2022"],"name":"Saro","content":"https://drive.google.com/uc?id=1dE8L7w2DuOfQSJwf5oRjAeJ-VZfy5o-6","enabled":1,"index":1,"div":{}},{"id":"1ZO2poqaylmh7_FkEjRthozVXFpcP1Edx","date":["18","08","2022"],"name":"suchetto","content":"https://drive.google.com/uc?id=1ZO2poqaylmh7_FkEjRthozVXFpcP1Edx","enabled":1,"index":2,"div":{}},{"id":"1jkpZzqnQUdXv7QiW1khuwnSsdnjudBt-","date":["18","08","2022"],"name":"suca","content":"https://drive.google.com/uc?id=1clZbi1QzJQo_c7PGWx-nmLgfPhXqHdZR","enabled":1,"index":3,"div":{}}]');
	controls_div.hidden = false;
	updateOpacity();
	updateFanartList();
}

function toggleColor() {
	watermark_invert = watermark_invert == '' ? 'invert(1)' : '';
	updateColorDisplay();
}

function updateColorDisplay() {
	togglecolor_button.innerText = watermark_invert ? "⚫" : "⚪";
}

function addWatermark(event, img, c, ctx) {
	setBaseImage(img, c, ctx);

	const rect = c.getBoundingClientRect();
	const x = (event.clientX - rect.left) * c.width / c.clientWidth;
	const y = (event.clientY - rect.top) * c.height / c.clientHeight;

	ctx.globalAlpha = opacity_range.value;
	ctx.filter = watermark_invert;
	ctx.drawImage(WATERMARK, x - (WATERMARK_WIDTH / 2), y - (WATERMARK_HEIGHT / 2), WATERMARK_WIDTH, WATERMARK_HEIGHT);
}

function updateOpacity() {
	opacity_label.innerHTML = Math.round(opacity_range.value * 100) + '%';
}

function setBaseImage(img, c, ctx) {
	const f = Math.min(MAX_WIDTH / img.width, MAX_HEIGHT / img.height);

	const new_width = c.width = Math.ceil(img.width * f);
	const new_height = c.height = Math.ceil(img.height * f)

	ctx.imageSmoothingEnabled = (f < 1);
	ctx.drawImage(img, 0, 0, new_width, new_height);
}

function moveUpDown(id, amount) {
	const pos = fanarts.indexOf(fanarts.find(element => element.id == id));
	const new_pos = pos + amount;

	if (new_pos <= -1 || new_pos >= fanarts.length) {
		return;
	}

	[fanarts[pos], fanarts[new_pos]] = [fanarts[new_pos], fanarts[pos]];

	updateFanartList();
}
