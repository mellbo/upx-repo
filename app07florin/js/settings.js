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
		for (let i=1; i<=15;i++){
			document.getElementById(["idRoomTemp-Zone"+i]).innerHTML = (parseFloat(jsonObject[['LIVE'+i+'TEMP']])/1000).toFixed(1);
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
  function initButton() {
    //document.getElementById('button').addEventListener('click', toggle);
  }
/*------------------------------------------------------------------------------------------------*/
function force_update(type, idx, value){
	let data = {};
	switch(type){
		case 'SETZNTEMP':
			let fxName = "SET"+idx.toString()+"ZNTEMP";
			value = (parseFloat(value)*1000).toFixed(0);
			data = {
			  [fxName] : value
			};
		break;
		case 'SETNAME':
			data = {
			  ["SET"+idx.toString()+"NAME"] : value
			};		
		break;
	}
	
	let _js = JSON.stringify(data);	
    websocket.send(_js);
	console.log("update..",_js);
	_js	= null;
}
/*------------------------------------------------------------------------------------------------*/
/*REGULAR*/
/*------------------------------------------------------------------------------------------------*/