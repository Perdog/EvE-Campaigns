$(document).ready(function(){
	// Check if we're trying to load some data or not.
	if (location.search) {
		console.log("Bueno: " + location.search);
		
		// If yes, parse the search
		loadOnly = (parseSearch("download") ? true : false);
		var d = parseSearch("dates");
		dates = d.split("-");
		
		var teamA = parseSearch("teamA");
		var teamB = parseSearch("teamB");
		
		aIDs = teamA.split(",");
		bIDs = teamB.split(",");
		
		$('#loading-page').show(500);
		
		if (loadOnly) {
			$("#load-static").text("Loading things into DB only");
			$("#load-text").text("Starting...");
		}
		
		loadEntityNames(aIDs.concat(bIDs));
	} else {
		// If not, load normal page
		console.log("No bueno");
		$('#default-page').show();
		var date = new Date();
		$('#endDate').attr("max", date.getFullYear() + "-" + (date.getMonth() < 9 ? "0" : "") + (date.getMonth() + 1) + "-" + (date.getDate() < 10 ? "0" : "") + date.getDate());
		$('#endDate').attr("value", date.getFullYear() + "-" + (date.getMonth() < 9 ? "0" : "") + (date.getMonth() + 1) + "-" + (date.getDate() < 10 ? "0" : "") + date.getDate());
	}
});

$('#campaign-form').submit(function(e) {
	e.preventDefault();
	
	$('#createCampaign').attr("disabled", "disabled");
	
	resetAllTheThings();
	
	var names = document.getElementsByClassName("searchbox");
	
	for (var i = 0; i < names.length; i++) {
		if (names[i].value.length > 0)
			namesList.push(names[i].value);
	}
	
	var url = "https://esi.tech.ccp.is/latest/universe/ids/?datasource=tranquility";
	var fetch = new XMLHttpRequest();
	fetch.onload = checkNames;
	fetch.onerror = nameError;
	fetch.open('post', url, true);
	fetch.setRequestHeader('Content-Type','application/json');
	fetch.setRequestHeader('accept','application/json');
	fetch.send(JSON.stringify(namesList));
	
	return false;
});

