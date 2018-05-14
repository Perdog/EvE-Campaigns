
function uploadKillsToDB() {
	var i = killUploadCount;
	if (i == zkbKills.length)
		return;
	killsDB.where("killmail_id", "==", zkbKills[i].killmail_id)
			.get()
			.then(function(snap){
				if (snap.empty) {
					killsDB.add(zkbKills[i])
							.then(function(docRef){
								console.log("Uploading killmails... " + i + "/" + zkbKills.length + "(New)");
							})
							.catch(function(err){
								console.error("Error adding killmail to DB: ", err);
							});
				} else {
					console.log("Uploading killmails... " + i + "/" + zkbKills.length + "(Existed)");
				}
				$("#load-text").text("Uploading killmails... " + i + "/" + zkbKills.length);
				var tempInt = ((i/zkbKills.length)*100);
				$('#load-progress').attr("value", tempInt);
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
					$("#load-text").text("Uploading systems... " + i + "/" + systemsToUpload.length);
					systemUploadCount++;
					if (systemUploadCount < systemsToUpload.length)
						uploadSystemsToDB();
					else
						setTimeout(uploadEntitiesToDB(), 1000);
				})
				.catch(function (error) {
					console.error("Error adding system: ", error);
				});
	} else
		setTimeout(uploadEntitiesToDB(), 1000);
}

function uploadEntitiesToDB() {
	var i = entityUploadCount;
	if (entitiesToUpload.length > 0) {
		entityDB.add(entitiesToUpload[i])
				.then(function(ref) {
					console.log("Success adding entity: ", ref);
					$("#load-text").text("Uploading entities... " + i + "/" + entitiesToUpload.length);
					entityUploadCount++;
					if (entityUploadCount < entitiesToUpload.length)
						uploadEntitiesToDB();
					else
						setTimeout(uploadKillsToDB(), 1000);
				})
				.catch(function (error) {
					console.error("Error adding entity: ", error);
				});
	} else
		setTimeout(uploadKillsToDB(), 1000);
}

