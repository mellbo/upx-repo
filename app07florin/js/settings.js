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
    document.getElementById('idBtnSaveName').addEventListener('click', updAllZoneName);
	document.getElementById('idBtnSavePsk').addEventListener('click', updConnectData);
	document.getElementById('idRestoreESP').addEventListener('click', restoreESP);
	document.getElementById('idRebootESP').addEventListener('click', rebootESP);
	document.getElementById('idBtnSafeMod').addEventListener('click', rebootInSafeMode);
	document.getElementById('idGateway').addEventListener('click', openGatewayLink);
	document.getElementById('idBtnSaveHisterizis').addEventListener('click', updHisterizis);
	document.getElementById('idBtnSaveCalibrations').addEventListener('click', updCalibSensor);	
  }
/*------------------------------------------------------------------------------------------------*/
function createZonesByDb(){
	let dbN = document.getElementById("idInitNmeZone").value;
	let dbH = document.getElementById("idInitHistZones").value;
	let dbC = document.getElementById("idInitCalibSZ").value;
	
	let html_code = [];
	let elContainerZoneName = document.getElementById("idContainerZoneName");
	/*Name Zones*/
	for (let i = 1; i <= 15; i++) {		
		let xName = dbN.split("::")[i-1];
		let xLblName = "Zona "+i.toString();
		
		html_code.push('<div class="input-group input-group-sm mb-2 inputSettings">');
		html_code.push('<div class="input-group-prepend inputSettings">');
		html_code.push('<span class="input-group-text inputSettings">'+xLblName+'</span></div>');
		html_code.push('<input type="text" class="form-control inputSettings" id="Z'+i.toString()+'NME" autocomplete="off" maxlength="12" value="'+xName+'"/></div>');
	}
	elContainerZoneName.innerHTML = html_code.join("");
	html_code = null;
	
	/* Histerizis Zones */
	let elContainerHisterizis = document.getElementById("idZoneHisterizisContainer");
	html_code = [];
	for (let i = 1; i <= 15; i++) {
		//let xHist = (decodeTemperature(parseInt(dbH.split("::")[i-1]),0.25)).toFixed(2);
		let xLblName = "Histerizis Zona(" + i.toString()+ "): ";
		let xName = dbN.split("::")[i-1];
		html_code.push('<option value="'+i.toString()+'">'+xLblName+xName+'</option>');			
		//html_code.push('<div class="form-group p-0 pl-4 pr-4 mb-2">');
		//html_code.push('<label class="small m-0 p-0" for>'+xLblName+xName+'<br />');
		//html_code.push('<span id="idLblValHistZ'+i.toString()+'" class="m-0 p-0">'+xHist+'</span></label>');
		//html_code.push('<input type="range" class="form-control-range clsRange" id="Z'+i.toString()+'HST" min="0.25" max="2.5" step="0.25" value="'+xHist+'" disabled /></div>');
	}
	elContainerHisterizis.innerHTML = html_code.join("");
	html_code = null;
	document.getElementById("idHisterizisValue").value = (decodeTemperature(parseInt(dbH.split("::")[0]),0.25)).toFixed(2);
	document.getElementById("idLblValHisterizis").innerHTML = document.getElementById("idHisterizisValue").value.toString();
	
	/* Calibration zone */
	let elSelectZoneCalib = document.getElementById("idZoneCalibContainer");
	html_code = [];
	for (let i = 1; i <= 15; i++) {		
		let xLblName = "Zona(" + i.toString()+ "): ";
		let xName = dbN.split("::")[i-1];
		html_code.push('<option value="'+i.toString()+'">'+xLblName+xName+'</option>');		
	}
	elSelectZoneCalib.innerHTML = html_code.join("");
	html_code = null;
	document.getElementById("idInpCalibValue").value = decodeCalibration(dbC.split("::")[0]);
	
	
	/*addEventListener*/
	// update tracking value
	document.getElementById("idHisterizisValue").addEventListener('change', function(e){	
		document.getElementById("idLblValHisterizis").innerHTML = document.getElementById("idHisterizisValue").value.toString();
	});
	
	/* for change calibration */
	document.getElementById("idSelectZoneCalib").addEventListener('change', function(e){
		let zoneIDSelected = $('#idSelectZoneCalib option:selected').val();
		let xCalibValue = dbC.split("::")[zoneIDSelected-1];
		document.getElementById("idInpCalibValue").value = decodeCalibration(xCalibValue);
	});
	document.getElementById("idMinusCalib").addEventListener('click', function(e){
		let elInpCalibValue = document.getElementById("idInpCalibValue");
		let valInp = parseFloat(elInpCalibValue.value);
			if (valInp > -5.0) {
				valInp -= 0.25;
				elInpCalibValue.value = valInp;
			}
	});
	document.getElementById("idPlusCalib").addEventListener('click', function(e){
		let elInpCalibValue = document.getElementById("idInpCalibValue");
		let valInp = parseFloat(elInpCalibValue.value);
			if (valInp < 5.0) {
				valInp += 0.25;
				elInpCalibValue.value = valInp;
			}
	});	
}
/*------------------------------------------------------------------------------------------------*/
function updAllZoneName() {	
	let data = {};
	for (let i = 1; i <= 15; i++) {
		let idxField = "Z"+i.toString()+"NME";
		let nme = "SET"+i.toString()+"NAME";
		let val = document.getElementById([idxField]).value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
		data[[nme]] = val;
	}
		
	let _js = JSON.stringify(data);	
    websocket.send(_js);
	_js	= null;
	data = null;
	document.getElementById('idBtnSaveName').disabled = true;
}
/*------------------------------------------------------------------------------------------------*/
function decodeTemperature(Tbyte, pasT = 0.5) {
  return (parseInt(Tbyte) * pasT);
}
/*------------------------------------------------------------------------------------------------*/
function encodeTemperature(fTemp, pasT = 0.5) {
  return  parseInt(fTemp / pasT);
}
/*------------------------------------------------------------------------------------------------*/
function updHisterizis() {
	let data = {};
	let newHistVal = document.getElementById("idHisterizisValue").value;
	let zoneID = $('#idSelectZoneHisterizis option:selected').val();
	let nme = "SET"+zoneID.toString()+"ZNHIST";
	let val = (encodeTemperature(parseFloat(newHistVal), 0.25)).toFixed(0);
	data[[nme]] = val;

	document.getElementById('idBtnSaveHisterizis').disabled = true;
	setTimeout(function(){
		document.getElementById('idBtnSaveHisterizis').disabled = false;
	}, 2000);

	let _js = JSON.stringify(data);
    websocket.send(_js);
	_js	= null;
	data = null;
}
/*------------------------------------------------------------------------------------------------*/

function enableEditHisterizis() {
	$(".clsRange").removeAttr("disabled");
	document.getElementById('idBtnSaveHisterizis').disabled = false;
	document.getElementById('idEnableEditHisterizis').disabled = true;
	
}
/*------------------------------------------------------------------------------------------------*/
function updConnectData() {
	let data = {
		"STASSID": document.getElementById("SSID").value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
		"STAPSK": document.getElementById("SSPSK").value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
		"WEBPASSWORD": document.getElementById("WEBPASS").value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
	};
	
	let _js = JSON.stringify(data);
    websocket.send(_js);
	_js	= null;
	data = null;
	document.getElementById('idBtnSavePsk').disabled = true;
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
function openGatewayLink() {
	let elRouterIP = document.getElementById("idRouterIP");
	let RouterIP = elRouterIP.innerHTML;
	setTimeout(function(){
		alert("Pagina se va deschide in fereastra noua.");
		window.open("http://"+RouterIP);
		}, 20);
}
/*------------------------------------------------------------------------------------------------*/
/*Calibration*/
/*------------------------------------------------------------------------------------------------*/
function fmap(x, in_min, in_max, out_min, out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
/*------------------------------------------------------------------------------------------------*/
function encodeCalibration(inTemp){
	if ((inTemp > 5) || (inTemp < -5)) return 0;
	let result = fmap(inTemp, -5.0, 5.0, 5000, 15000); // -5...0...5 => 5000..10000..15000
	return parseFloat((result).toFixed(0));
}
/*------------------------------------------------------------------------------------------------*/
function decodeCalibration(inCalib) {
	let result = fmap(inCalib, 5000, 15000, -5.0, 5.0);
	return (result).toFixed(2);
}
/*------------------------------------------------------------------------------------------------*/
function updCalibSensor() {
	let data = {};
	let newCalibVal = document.getElementById("idInpCalibValue").value;
	let zoneID = $('#idSelectZoneCalib option:selected').val();
	let nme = "SET"+zoneID.toString()+"CALIBSZ";
	let val = (encodeCalibration(parseFloat(newCalibVal))).toFixed(0);
	data[[nme]] = val;

	document.getElementById('idBtnSaveCalibrations').disabled = true;
	setTimeout(function(){
		document.getElementById('idBtnSaveCalibrations').disabled = false;
	}, 2000);

	let _js = JSON.stringify(data);
    websocket.send(_js);
	_js	= null;
	data = null;
}
/*------------------------------------------------------------------------------------------------*/
