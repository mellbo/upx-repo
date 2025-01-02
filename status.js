  var gateway = `ws://${window.location.hostname}/ws`;
  var websocket;
/*------------------------------------------------------------------------------------------------*/
$(function() {	//run when doc loaded
	setTimeout(function(){
		//
	},1000);
});
/*------------------------------------------------------------------------------------------------*/
$(document).ready(function() {
	createZonesByDb();
    initWebSocket();
    initButton();
});
/*------------------------------------------------------------------------------------------------*/
  function onOpen(event) {
    console.log('Connection opened');
  }
/*------------------------------------------------------------------------------------------------*/
  function onClose(event) {
    console.log('Connection closed');
    setTimeout(initWebSocket, 2000);
  }
/*------------------------------------------------------------------------------------------------*/
  function initWebSocket() {
    console.log('Trying to open a WebSocket connection...');
    websocket = new WebSocket(gateway);
    websocket.onopen    = onOpen;
    websocket.onclose   = onClose;
    websocket.onmessage = onMessage; // <-- add this line
  }
/*------------------------------------------------------------------------------------------------*/
  /*update fields*/
  function onMessage(event) {
	let jsonObject = JSON.parse(event.data);
		document.getElementById("cMillis").innerText = jsonObject['cMs'];
		jsonObject = null;
  }
/*------------------------------------------------------------------------------------------------*/
  function initButton() {	 
	 document.getElementById('idBtnRefresh').addEventListener('click', function(){
		setTimeout(function(){
			location.reload();
		}, 500);		 
	 });
  }
/*------------------------------------------------------------------------------------------------*/
function createZonesByDb(){
	let dbALLSENSOR = document.getElementById("idInitAllSensor").value;
	let dbALLFORCE = document.getElementById("idInitAllForce").value;
	
	let html_code = [];
	let elContainerZoneName = document.getElementById("idContainer");
	
	/*senzori*/
	for (let i = 1; i <= 15; i++) {		
		let xState = dbALLSENSOR.split("::")[i-1];
		let xLblName = "Senzor Zona "+i.toString();
		
		let cls = '';
		let svalue = '';
		if (xState == 0){
			cls = "staFail flash animated infinite";
			svalue = '!! FAIL !!';
		} else {
			cls = "staGood";
			svalue = 'STATUS OK';
		}
		
		html_code.push('<div class="input-group input-group-sm mb-2 staBorder">');
		html_code.push('<div class="input-group-prepend">');
		html_code.push('<span class="input-group-text staDevName">'+xLblName+'</span>');
		html_code.push('</div><input type="text" class="form-control '+cls+'" autocomplete="off" maxlength="12" readonly value="'+svalue+'" style="text-align: center;" /></div>');		
	}
	/* module forta*/
	for (let i = 1; i <= 4; i++) {		
		let xState = dbALLFORCE.split("::")[i-1];
		let xLblName = "Force Module "+i.toString();
		
		let cls = '';
		let svalue = '';
		if (xState == 0){
			cls = "staFail flash animated infinite";
			svalue = '!! FAIL !!';
		} else {
			cls = "staGood";
			svalue = 'STATUS OK';
		}
		
		html_code.push('<div class="input-group input-group-sm mb-2 staBorder">');
		html_code.push('<div class="input-group-prepend">');
		html_code.push('<span class="input-group-text staDevName">'+xLblName+'</span>');
		html_code.push('</div><input type="text" class="form-control '+cls+'" autocomplete="off" maxlength="12" readonly value="'+svalue+'" style="text-align: center;" /></div>');		
	}	
	
	elContainerZoneName.innerHTML = html_code.join("");
	html_code = null;	
}