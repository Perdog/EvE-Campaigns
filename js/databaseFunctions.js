
function uploadKillsToDB() {
	var i = killUploadCount;
	killsDB.where("killmail_id", "==", zkbKills[i].killmail_id)
			.get()
			.then(function(snap){
				if (snap.empty) {
					killsDB.add(zkbKills[i])
							.then(function(docRef){
								console.log("Killmail injected");
							})
							.catch(function(err){
								console.error("Error adding killmail to DB: ", err);
							});
				} else {
					console.log("Kill already exists");
				}
				killUploadCount++;
				if (killUploadCount < zkbKills.length) {
					uploadKillsToDB();
				}
			})
			.catch(function(err){
				console.error("Error looking up killmail_id: ", err);
			});
}

function uploadSystemsToDB() {
	var i = systemUploadCount;
	if (systemsToUpload.length > 0) {
		systemDB.add(systemsToUpload[i])
				.then(function(ref) {
					console.log("Success adding system: ", ref);
					systemUploadCount++;
					if (systemUploadCount < systemsToUpload.length)
						uploadSystemsToDB();
					else
						setTimeout(uploadKillsToDB(), 1000);
				})
				.catch(function (error) {
					console.error("Error adding system: ", error);
				});
	} //else
		//setTimeout(uploadKillsToDB(), 1000);
}

