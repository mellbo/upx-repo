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
	InitiateWithData();
	initButton();
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
    websocket.onmessage = onMessage;
  }
/*------------------------------------------------------------------------------------------------*/
  /*update fields*/
function onMessage(event) {
	let jsonObject = JSON.parse(event.data);
		document.getElementById("cMillis").innerText = jsonObject['cMs'];
		document.getElementById("idVPS_state").innerHTML = jsonObject['VPS_CONNECTED'];
		document.getElementById("idRSSI_level").innerHTML = jsonObject['SIGNALPWR'] + "%";
		document.getElementById("idDFU_state").innerHTML = jsonObject['DFU_MODE'];
		jsonObject = null;
}
/*------------------------------------------------------------------------------------------------*/
/*REGULAR*/
/*------------------------------------------------------------------------------------------------*/
function mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}
/*------------------------------------------------------------------------------------------------*/
function InitiateWithData() { 
    /* SIGNALPWR::VPS_CONNECTED::DFU_MODE::COMPORT::COMSPEED*/
	let dbData = document.getElementById("idInitData").value;
	
	let SIGNALPWR_RAW = parseInt(dbData.split("::")[0], 10);
	let _SIGNALPWR = Math.max(0, Math.min(100, mapRange(SIGNALPWR_RAW, -100, -40, 0, 100)));
	
	let SIGNALPWR = Math.round(_SIGNALPWR).toString()+"%";		
	let VPS_CONNECTED = dbData.split("::")[1] ? "NOT CONNECTED":"CONNECTED";
	let DFU_MODE = dbData.split("::")[2] ? "TX/RX":"DFU ON";
	let COMPORT = parseInt(dbData.split("::")[3]);
	let COMSPEED = parseInt(dbData.split("::")[4]);
	
	document.getElementById("idVPS_state").innerHTML = VPS_CONNECTED;
	document.getElementById("idRSSI_level").innerHTML = SIGNALPWR;
	document.getElementById("idDFU_state").innerHTML = DFU_MODE;
	document.getElementById("idPortCom").value = COMPORT;
	document.getElementById("idPortSpeed").value = COMSPEED;	
}
/*------------------------------------------------------------------------------------------------*/
  function initButton() {
    document.getElementById('idBtnARMING').addEventListener('click', setDFUNow);
	document.getElementById('idRestoreESP').addEventListener('click', restoreESP);
	document.getElementById('idRebootESP').addEventListener('click', rebootESP);
	document.getElementById('idBtnSafeMod').addEventListener('click', rebootInSafeMode);
	document.getElementById('idBtnSavePortCOM').addEventListener('click', doSavePortCOM);	
	document.getElementById('idPortSpeed').addEventListener('change', doSavePortSpeed);
  }
/*------------------------------------------------------------------------------------------------*/
function doSavePortSpeed(){
	let data = {
		"PORTSPEED": document.getElementById("idPortSpeed").value
	};
	
	let _js = JSON.stringify(data);	
    websocket.send(_js);
	_js	= null;
	data = null;	  
}
/*------------------------------------------------------------------------------------------------*/
function doSavePortCOM(){
	let data = {
		"COMPORT": document.getElementById("idPortCom").value
	};
	
	let _js = JSON.stringify(data);	
    websocket.send(_js);
	_js	= null;
	data = null;	  
}
/*------------------------------------------------------------------------------------------------*/
function setDFUNow(){
	if (document.getElementById("idDFU_state").textContent == 'DFU ON') return;
	let data = {
		"DFU_MODE": 1
	};
	
	let _js = JSON.stringify(data);	
    websocket.send(_js);
	_js	= null;
	data = null;
	alert("DFU mode is ON. Return to Arduino IDE and press UPLOAD firmware\n"+
		  "if target is allready connected.\n"+
		  "Info: You can allways type 'DFU' in ArduinoIDE console\n"+
		  "\tfor Enable DFU like here..");		  
}
/*------------------------------------------------------------------------------------------------*/
function restoreESP(){
	let data = {
		"RESET": 1
	};
	
	let _js = JSON.stringify(data);	
    websocket.send(_js);
	_js	= null;
	data = null;
	alert("Sistemul se reseteaza si restarteaza, aproximativ 1 minut.\n"+
		  "Dupa restaurare, este posibil sa fie nevoie sa intrati in SAFEMODE\n"+
		  "pentru a introduce datele de configurare pentru Internet WIFI.\n"+
		  "Adresa mea in mod AP este: http://192.168.1.1");
	setTimeout(function(){
		window.location.replace("http://192.168.1.1");
		}, 3000);			  
}
/*------------------------------------------------------------------------------------------------*/
function rebootESP(){
	let data = {
		"RESTART": 1
	};
	
	let _js = JSON.stringify(data);	
    websocket.send(_js);
	_js	= null;
	data = null;
	alert("Sistemul se restarteaza, 40 secunde.\n"+
		  "Actualizati (refresh) pagina dupa timp-ul expirat.");
	setTimeout(function(){
		location.reload();
		}, 3000);		  
}
/*------------------------------------------------------------------------------------------------*/
function rebootInSafeMode(){
	let data = {
		"SAFEMODE": 1
	};
	
	let _js = JSON.stringify(data);	
    websocket.send(_js);
	_js	= null;
	data = null;
	alert("Sistemul se restarteaza, si va rula in mod AP-SAFEMODE.\n"+
		  "Cautati in lista WIFI SSID 'UPX-GATEWAY' si conectati-va.\n"+
		  "Adresa mea pentru AP este: http://192.168.1.1\n\n"+
		  "Confirmati acest dialog dupa ce sunteti deja conectat la 'UPX-GATEWAY' !");
	setTimeout(function(){
		window.location.replace("http://192.168.1.1");
		}, 3000);		  
}
/*------------------------------------------------------------------------------------------------*/
