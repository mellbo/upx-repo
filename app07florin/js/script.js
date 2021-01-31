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
	createZonehtml();
    initWebSocket();
    initButton();	
});
/*------------------------------------------------------------------------------------------------*/
  function initWebSocket() {
    console.log('Trying to open a WebSocket connection...');
    websocket = new WebSocket(gateway);
    websocket.onopen    = onOpen;
    websocket.onclose   = onClose;
    websocket.onmessage = onMessage; // <-- add this line
  }
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
  function onMessage(event) { /*update fields*/
	let jsonObject = JSON.parse(event.data);
		document.getElementById("cMillis").innerText = jsonObject["live"]['cMs'];
		//document.getElementById("state").innerText = jsonObject["live"]['ledState'];
  }
/*------------------------------------------------------------------------------------------------*/
  function initButton() {
    //document.getElementById('button').addEventListener('click', toggle);
  }
/*------------------------------------------------------------------------------------------------*/
  function toggle(){
	let data = {
	"live": {
		"toggle":"1"
		},
	"settings":{
			"ssid":"cacat",
			"sspass":"muie"
		}};
	let _js = JSON.stringify(data);	
    websocket.send(_js);
  }
/*------------------------------------------------------------------------------------------------*/
function force_update(){
	// ?
	console.log("update..");
}
/*------------------------------------------------------------------------------------------------*/
/*REGULAR*/
/*------------------------------------------------------------------------------------------------*/
function createZonehtml() {
	/*
	%ZONEx_TEMP%
	%ZONEx_SETTEMP%
	%ZONEx_HEATING%
	%ZONEx_NAME%
	*/
	let elRowContainer = document.getElementById("idRowContainer");
	let html_code = [];
	
	for (let i = 0; i < 15; i++) {
		html_code.push('<div class="col-sm-6 col-md-4 mb-4">');
		html_code.push('<div class="card lcd_style">');
		html_code.push('<div class="card-body mb-0 p-0">');
		html_code.push('<i class="fa fa-fire lcd_icon mr-2 d-none" id="idHeatOn-Zone'+i.toString()+'"></i>');
		html_code.push('<h4 class="card-title lcd_font1 m-0 text-center" id="idRoomTemp-Zone'+i.toString()+'">%ZONE'+i.toString()+'_TEMP%</h4>');
		html_code.push('<h3 class="mb-0 lcd_font2">%ZONE'+i+'_NAME%</h3>');
		html_code.push('<h3 id="idCurSetTemp-Zone'+i+'" class="mb-0 lcd_font3">%ZONE'+i.toString()+'_SETTEMP%</h3>');
		html_code.push('<i class="fa fa-backward icon_arrow_left" id="idTempDown-Zone'+i.toString()+'"></i>');
		html_code.push('<i class="fa fa-forward icon_arrow_right" id="idTempUp-Zone'+i.toString()+'"></i>');
		html_code.push('</div></div></div>');
	}
	elRowContainer.innerHTML = html_code.join("");
	html_code = null;
	
	for (let i = 0; i < 15; i++) {		
		let idDownZone = 'idTempDown-Zone'+i.toString();
		let idCurentSetTemp = 'idCurSetTemp-Zone'+i.toString();		
		document.getElementById(idDownZone).addEventListener('click', function(e){
			let elCurSetTemp = document.getElementById(idCurentSetTemp);
			let curentTemp = parseFloat(elCurSetTemp.innerHTML) - 0.5;
				if (curentTemp < 5.0) curentTemp = 5.0;
				elCurSetTemp.innerHTML = (curentTemp).toFixed(1).toString();
				force_update();
		});

		let idUpZone = 'idTempUp-Zone'+i.toString();
		//let idCurentSetTemp = 'idCurSetTemp-Zone'+i.toString();		
		document.getElementById(idUpZone).addEventListener('click', function(e){
			let elCurSetTemp = document.getElementById(idCurentSetTemp);
			let curentTemp = parseFloat(elCurSetTemp.innerHTML) + 0.5;
				if (curentTemp > 35.0) curentTemp = 35.0;
				elCurSetTemp.innerHTML = (curentTemp).toFixed(1).toString();
				force_update();
		});			
	}
}