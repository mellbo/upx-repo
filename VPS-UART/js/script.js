  var gateway = `ws://${window.location.hostname}/ws`;
  var websocket;
  var millis_esp = 0;
  var DFU_MODE = 0;
/*------------------------------------------------------------------------------------------------*/
$(function() {	//run when doc loaded
	setTimeout(function(){
		checkMillis();
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
		millis_esp = parseInt(jsonObject['cMs'], 10);
		DFU_MODE = jsonObject['DFU_MODE'];
		document.getElementById("cMillis").innerText = jsonObject['cMs'];
		document.getElementById("idVPS_state").innerHTML = jsonObject['VPS_CONNECTED'];
		document.getElementById("idRSSI_level").innerHTML = jsonObject['SIGNALPWR'] + "%";
		document.getElementById("idDFU_state").innerHTML = jsonObject['DFU_MODE'];
		document.getElementById("idBATT_VCC").innerHTML = jsonObject['BATT_VCC'] + "V";
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
	let BATT_VCC = parseFloat(dbData.split("::")[5]);
	
	document.getElementById("idVPS_state").innerHTML = VPS_CONNECTED;
	document.getElementById("idRSSI_level").innerHTML = SIGNALPWR;
	document.getElementById("idDFU_state").innerHTML = DFU_MODE;
	document.getElementById("idPortCom").value = COMPORT;
	document.getElementById("idPortSpeed").value = COMSPEED;
	document.getElementById("idBATT_VCC").innerHTML = BATT_VCC;
	window.DFU_MODE = DFU_MODE;
	
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
	alert("The system is resetting and restarting, approximately 1 minute.\n" +
      "After restoration, you may need to enter SAFEMODE\n" +
      "to input the configuration data for Internet WIFI.\n" +
      "My address in AP mode is: http://192.168.1.1");

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
	alert("The system is restarting, 40 seconds.\n" +
      "Refresh the page after the time has elapsed.");

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
	alert("The system is restarting and will run in AP-SAFEMODE.\n" +
      "Look for the WIFI SSID 'UPX-GATEWAY' and connect to it.\n" +
      "My address for AP is: http://192.168.1.1\n\n" +
      "Confirm this dialog after you are already connected to 'UPX-GATEWAY'!");

	setTimeout(function(){
		window.location.replace("http://192.168.1.1");
		}, 3000);		  
}
/*------------------------------------------------------------------------------------------------*/
function checkMillis() {
  let currentMillis = millis_esp;
  if (typeof checkMillis.lastMillis === 'undefined') {
    checkMillis.lastMillis = 0;
  }
  if (currentMillis === checkMillis.lastMillis) {
	if (DFU_MODE == "TX/RX") {
		alert("LEGATURA A FOST INTRERUPTA");
	}	
	location.reload(true);
  } else {
    checkMillis.lastMillis = currentMillis;
  }
  setTimeout(checkMillis, 1500);
}

/*------------------------------------------------------------------------------------------------*/