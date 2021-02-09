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
		for (let i=1; i<=15;i++){
			document.getElementById(["idRoomTemp-Zone"+i]).innerHTML = parseFloat(decodeTemperature((jsonObject[['LIVE'+i+'TEMP']]),0.25)).toFixed(1);
		}
		for (let i=1; i<=15;i++){
			let elHeating = document.getElementById(["idHeatOn-Zone"+i]);
			let isEnable = parseInt(jsonObject[['ZONE'+i+'HEAT']]);
			if (isEnable) {
				elHeating.classList.remove("d-none");
			} else {
				elHeating.classList.add("d-none");
			}
		}
		jsonObject = null;
  }
/*------------------------------------------------------------------------------------------------*/
function force_update(type, idx, value){
	let data = {};
	switch(type){
		case 'SETZNTEMP':
			let fxName = "SET"+idx.toString()+"ZNTEMP";
			value = (encodeTemperature(parseFloat(value), 0.5)).toFixed(0);
			data = {
			  [fxName] : value
			};
		break;
	}
	
	let _js = JSON.stringify(data);	
    websocket.send(_js);
	_js	= null;
	data = null;
}
/*------------------------------------------------------------------------------------------------*/
/*REGULAR*/
/*------------------------------------------------------------------------------------------------*/
function decodeTemperature(Tbyte, pasT = 0.5) {
  return (parseInt(Tbyte) * pasT);
}
/*------------------------------------------------------------------------------------------------*/
function encodeTemperature(fTemp, pasT = 0.5) {
  return  parseInt(fTemp / pasT);
}
/*------------------------------------------------------------------------------------------------*/
function createZonehtml() {
	let dbL = document.getElementById("idLiveDataStorage").value;
	let dbS = document.getElementById("idTempSetInit").value;
	let dbH = document.getElementById("idZoneHeatingInit").value;
	let dbN = document.getElementById("idZoneName").value;
	
	let elRowContainer = document.getElementById("idRowContainer");
	let html_code = [];
	
	for (let i = 1; i <= 15; i++) {
		let xHeat = dbH.split("::")[i-1];
		let clsHeat = xHeat ? "d-none" : "";
		let xRoomTemp = (decodeTemperature(parseInt(dbL.split("::")[i-1]),0.25)).toFixed(1);
		let xSetTemp = ((decodeTemperature(parseInt(dbS.split("::")[i-1]),0.5))).toFixed(1);
		let xName = dbN.split("::")[i-1];
		
		html_code.push('<div class="col-sm-6 col-md-4 mb-4">');
		html_code.push('<div class="card lcd_style">');
		html_code.push('<div class="card-body mb-0 p-0">');
		html_code.push('<i class="fa fa-fire flash animated infinite lcd_icon mr-2 '+clsHeat+'" id="idHeatOn-Zone'+i.toString()+'"></i>');
		html_code.push('<h1 class="d-flex justify-content-center align-items-center card-title lcd_font1 m-0 text-center" id="idRoomTemp-Zone'+i.toString()+'">'+xRoomTemp+'</h1>');
		html_code.push('<h3 class="mb-0 lcd_font2" id="idZone-'+i.toString()+'">'+xName+'</h3>');
		html_code.push('<h3 id="idCurSetTemp-Zone'+i+'" class="mb-0 lcd_font3">'+xSetTemp+'</h3>');
		html_code.push('<i class="fa fa-backward icon_arrow_left" id="idTempDown-Zone'+i.toString()+'"></i>');
		html_code.push('<i class="fa fa-forward icon_arrow_right" id="idTempUp-Zone'+i.toString()+'"></i>');
		html_code.push('</div></div></div>');
	}
	elRowContainer.innerHTML = html_code.join("");
	html_code = null;
	
	/*addEventListener*/
	for (let i = 1; i <= 15; i++) {		
		let idDownZone = 'idTempDown-Zone'+i.toString();
		let idCurentSetTemp = 'idCurSetTemp-Zone'+i.toString();		
		document.getElementById(idDownZone).addEventListener('click', function(e){
			let elCurSetTemp = document.getElementById(idCurentSetTemp);
			let curentTemp = parseFloat(elCurSetTemp.innerHTML) - 0.5;
				
				if (curentTemp >= 5.0) {
					elCurSetTemp.innerHTML = (curentTemp).toFixed(1).toString();
						setTimeout(function(i){
							let elCurSetTemp = document.getElementById(idCurentSetTemp);
							force_update('SETZNTEMP', i, elCurSetTemp.innerHTML);		
						},1000);

				}
		});

		let idUpZone = 'idTempUp-Zone'+i.toString();
		//let idCurentSetTemp = 'idCurSetTemp-Zone'+i.toString();		
		document.getElementById(idUpZone).addEventListener('click', function(e){
			let elCurSetTemp = document.getElementById(idCurentSetTemp);
			let curentTemp = parseFloat(elCurSetTemp.innerHTML) + 0.5;
				
				if (curentTemp <= 35.0) {
					elCurSetTemp.innerHTML = (curentTemp).toFixed(1).toString();
						setTimeout(function(i){
							let elCurSetTemp = document.getElementById(idCurentSetTemp);
							force_update('SETZNTEMP', i, elCurSetTemp.innerHTML);		
						},1000);
				}
		});			
	}
	
	let elWeather = document.getElementById("idWeatherPlace"); 
		elWeather.innerHTML = '<iframe src="https://www.meteoblue.com/ro/vreme/widget/three?geoloc=detect&nocurrent=0&noforecast=0&days=3&tempunit=CELSIUS&windunit=KILOMETER_PER_HOUR&layout=dark"  frameborder="0" scrolling="NO" allowtransparency="true" sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox" style="width: 100%;height: 608px"></iframe>';
}