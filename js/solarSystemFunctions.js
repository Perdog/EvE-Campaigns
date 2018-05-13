
function loadSystemNames() {
	console.log("Fetching system names");
	$("#load-text").text("Loading system names...");
	
	systemFetchList = [];
	
	if (systemKills) {
		Object.keys(systemKills).forEach(function(key) {
			key = Number(key);
			// Increment our wait variable. If JS won't give me a proper wait function, I'll make it myself
			waitingOnSystems++;
			systemDB.where('id', '==', key)
					.get()
					.then(function(snap) {
						if (!snap.empty) {
							snap.forEach(function(doc) {
								systemKills[doc.data().id].name = doc.data().name;
							});
						} else {
							console.log("Failed to find " + key + ", search ESI for it");
							if (!systemFetchList.includes(key))
								systemFetchList.push(key);
						}
						waitingOnSystems--;
					})
					.catch(function(error) {
						console.error("Error in system id fetch: ", error);
					});
		});
	}
	setTimeout(fetchSystemNames, 100);
}

function fetchSystemNames() {
	// Make sure all DB calls are complete before trying to fetch data from ESI
	if (waitingOnSystems > 0) {
		setTimeout(fetchSystemNames, 100);
		console.log("Waiting on DB for system names");
		return;
	} else if (systemFetchList.length > 0) {
		console.log("Ready");
		console.log("System list: ", systemFetchList);
		
		for (var i = 0; (i*500)<systemFetchList.length;i++) {
			waitingOnSystems++;
			var tempList = systemFetchList.slice(i*500, Math.min(((i+1)*500), systemFetchList.length))
			var url = "https://esi.tech.ccp.is/latest/universe/names/?datasource=tranquility";
			var fetch = new XMLHttpRequest();
			fetch.onload = parseSystems;
			fetch.onerror = reqerror;
			fetch.open('post', url, true);
			fetch.setRequestHeader('Content-Type','application/json');
			fetch.setRequestHeader('accept','application/json');
			fetch.send(JSON.stringify(tempList));
		}
	} else {
		$("#load-text").text("System names loaded...");
		console.log("Name fetch is done");
		pullStats();
	}
}

function parseSystems() {
	var data = JSON.parse(this.responseText);
	
	if (data.error) {
		esiError(data.error);
		$("#load-text").text("Error loading system names...");
	} else {
		$("#load-text").text("System names found...");
		data.forEach(function(key) {
			if (systemKills) {
				if (Object.keys(systemKills).includes(key.id+"")) {
					systemKills[key.id].name = key.name;
					var temp = {
						id: key.id,
						name: key.name
					}
					systemsToUpload.push(temp);
				}
			}
		});
		waitingOnSystems--;
		if (waitingOnSystems == 0) {
			$("#load-text").text("System names loaded...");
			console.log("Name fetch is done");
			pullStats();
		}
	}
}

