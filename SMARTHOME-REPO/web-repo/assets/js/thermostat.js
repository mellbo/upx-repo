var DEBUG = 1;
var PAGENAME = '';
var gateway = window.location.port
  ? `ws://${window.location.hostname}:${window.location.port}/ws`
  : `ws://${window.location.hostname}/ws`;
var websocket;
var websck_is_connected = false;
var millis_esp = 0;
var WSCONNECTED = 0;
var RSSI = 0;
var isLOCAL = 0;
var WSCONNECTED = 0;
var ERROR_INSTANCE = 0;
var EN_SOUND = false;
var LAST_ERRID = -1;
var ERRLST_EXTERMAL = null;
/*
const LIVE_DATA_TYPE = 1; // index.html - live_data
const GET_DATA_TYPE  = 2; // settings.html - SYSTEM
const GET_DATA_QUICK = 3; // setings.html - qck_set_fdbck
const GET_DATA_LOGS  = 4; // logs.html
const GET_DATA_SUMAR = 5; // dashboard.html
const ONLY_PING = 254;
    //ERROR_INSTANCE = 255 but not use from script->esp
*/
var GET_DATA_THERMO = 6; //thermostat.html
/*-----------------------------------------------------------------------------------*/
$(document).ready(function() {
  initWebSocket(); //ESP WebSocket
    PAGENAME = window.location.pathname;
    PAGENAME = PAGENAME.split("/").pop();
    if (PAGENAME == '') PAGENAME = 'index';

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", function() {
        document.removeEventListener("visibilitychange", onVisibilityChange);
    });
    checkDevice();
    $('#idPlsWait').removeClass('hidden'); //show Loading

    setTimeout(function() {
      if (ERRLST_EXTERMAL == null) LoadERRLST_EXTERMAL();
    }, 2000); // delay 2000 ms
});
/*-----------------------------------------------------------------------------------*/
/* COMMON FUCNTION HERE */
/*ESP WebSocket*/
/*------------------------------------------------------------------------------------*/
function onOpenWS(event) {
  websck_is_connected = 1;
  info_reboot_web(false);
  setTimeout(pool_info_page, 250);  //pool_info_page(); //pool now
  setTimeout(function() {
    checkMillis();
  }, 8000);
  if (DEBUG) console.log('Connection opened');
}
/*-----------------------------------------------------------------------------------*/
function onCloseWS(event) {
  websck_is_connected = 0;
  if (DEBUG) console.log('Connection closed');
  if (!ERROR_INSTANCE) setTimeout(initWebSocket, 2000); //retry websocket
}
/*-----------------------------------------------------------------------------------*/
function initWebSocket() {
  if (DEBUG) console.log('Trying to open a WebSocket connection...');
  websocket = new WebSocket(gateway);
  websocket.onopen    = onOpenWS;
  websocket.onclose   = onCloseWS;
  websocket.onmessage = onMessageWS;
}
/*-----------------------------------------------------------------------------------*/
/*update fields*/
function onMessageWS(event) {
  var jsonObject = JSON.parse(event.data);
    if (DEBUG) console.log(jsonObject);
  //quick banned from server
  if (jsonObject.hasOwnProperty("ERROR_INSTANCE") == true) {
    ERROR_INSTANCE = 1;
    websocket.close();
    jsonObject = null;
    alert("You have to many page opened. Keep only one in your in browser or slow down action!");
    location.replace("/protection");
    return;
  }

  if (jsonObject.hasOwnProperty("cMs") == true)
      millis_esp = parseInt(jsonObject['cMs'], 10);
  if (jsonObject.hasOwnProperty("Local") == true)
      isLOCAL = jsonObject["Local"];
  if (jsonObject.hasOwnProperty("SIGNALPWR") == true)
      RSSI = jsonObject["SIGNALPWR"];
  if (jsonObject.hasOwnProperty("wsCnt") == true)
      WSCONNECTED = jsonObject["wsCnt"];

  var el = document.getElementById("idcMillis");
  if (el) el.innerHTML = millis_esp + ' - \u{1F4F6} ' + RSSI + '%' + ' \u{1F534} LIVE (' + WSCONNECTED + ')';

  if (PAGENAME == 'thermostat') {
    if (jsonObject.hasOwnProperty("QUICK_THERMO") == true)
        parseParamThermo(jsonObject);
    
    if (ERRLST_EXTERMAL !==null) {
      if (jsonObject.hasOwnProperty("ERRLST_IDX") == true) {
        var ERRLST_IDX = parseInt(jsonObject["ERRLST_IDX"], 10);
        if (LAST_ERRID != ERRLST_IDX) {
          LAST_ERRID = ERRLST_IDX;
          // convert ERRLST_IDX to message here then
          var errMSGCnv = ERRLST_EXTERMAL[ERRLST_IDX];
          showInfoAutoClose(10, true, errMSGCnv, false, null, null);
        }
      }
    }  
  }

	jsonObject = null;
}
/*-----------------------------------------------------------------------------------*/
function pool_info_page() {
  if ((ERROR_INSTANCE) || (!websck_is_connected)) return;
  var data = {
    "REQUEST_INFO": GET_DATA_THERMO
  };

  var _js = JSON.stringify(data);
  if (websck_is_connected) websocket.send(_js);
  _js	= null;
  data = null;

  // rearm pool
  if (websck_is_connected) {
    setTimeout(function(){
      pool_info_page();
      }, 2000);
  }
}
/*-----------------------------------------------------------------------------------*/
function checkMillis() {
  if (ERROR_INSTANCE) {
    return;
  }

  var currentMillis = millis_esp;
  if (typeof checkMillis.lastMillis === 'undefined') {
    checkMillis.lastMillis = 0;
  }
  if (currentMillis === checkMillis.lastMillis) {
    info_reboot_web(true);
    setTimeout(function() {
      window.location.reload(true);
    }, 3000);
  } else {
    checkMillis.lastMillis = currentMillis;
    setTimeout(checkMillis, 5000); // rearming checkMillis()
  }
}
/*-----------------------------------------------------------------------------------*/
function info_reboot_web(lvState){
  switch (lvState){
    case true:
      $('#idNoConnexion').removeClass('hidden');
      if (DEBUG) console.log('Rebooting WebPage');
    break;
    case false:
      $('#idNoConnexion').addClass('hidden');
    break;
  }
}
/*-----------------------------------------------------------------------------------*/
// showInfoAutoClose * showInfoAutoClose * showInfoAutoClose
/*-----------------------------------------------------------------------------------*/
var confirmTimerId = null;
function showInfoAutoClose(autoCloseSec, ALERTON, msg, callbackOk, callbackCancel) {
    if (confirmTimerId) {
        clearInterval(confirmTimerId);
        confirmTimerId = null;
    }

    var btnOk = document.getElementById("btnOkInfoAutoClose");
    var btnCancel = document.getElementById("btnCancelInfoAutoClose");
    var modalMsg = document.getElementById("lblInfoAutoClose");
    modalMsg.innerHTML = msg;
    autoFitText();

    if (callbackCancel === null) {
        btnCancel.classList.add('hidden');
    } else {
        btnCancel.classList.remove('hidden');
    }

    $('#modalInfoAutoClose').modal('show');

    if (autoCloseSec > 0) {
        var originalText = btnOk.textContent.replace(/\s*\[\d+\]$/, '');
        updateBtn();
        confirmTimerId = setInterval(function() {
            autoCloseSec--;
            if (autoCloseSec > 0) {
                updateBtn();
            } else {
                clearInterval(confirmTimerId);
                confirmTimerId = null;
                cancelHandler();
                //okHandler();
            }
        }, 1000);
    }

    if ((EN_SOUND) && (ALERTON)) myfavInfo.play();

    function updateBtn() {
        var secTxt = (autoCloseSec < 10 ? "0" + autoCloseSec : autoCloseSec);
        btnOk.textContent = originalText + " [" + secTxt + "]";
    }

    function cleanup() {
        btnOk.removeEventListener("click", okHandler);
        btnCancel.removeEventListener("click", cancelHandler);
        if (confirmTimerId) {
            clearInterval(confirmTimerId);
            confirmTimerId = null;
        }
    }

    function okHandler() {
        cleanup();
        $('#modalInfoAutoClose').modal('hide');
        $('.modal-backdrop').css('display', 'none');
        $('body').removeClass('modal-open'); 
        if (callbackOk) callbackOk();
    }

    function cancelHandler() {
        cleanup();
        $('#modalInfoAutoClose').modal('hide');
        $('.modal-backdrop').css('display', 'none');
        $('body').removeClass('modal-open');        
        if (callbackCancel) callbackCancel();
    }

    btnOk.addEventListener("click", okHandler);
    btnCancel.addEventListener("click", cancelHandler);
}
/*-----------------------------------------------------------------------------------*/
function secToDateTimeStr(seconds) {
	if (typeof seconds !== "number" || isNaN(seconds)) {
		return "Invalid";
	}
	var days = Math.floor(seconds / 86400);
	var remainder = seconds % 86400;
	var hours = Math.floor(remainder / 3600);
	remainder = remainder % 3600;
	var minutes = Math.floor(remainder / 60);
	var secs = remainder % 60;

	function pad(num) {
		if (num < 10) {
			return "0" + num;
		} else {
			return num;
		}
	}

	var result = "";
	if (days > 0) {
		result += days + "D ";
	}

	result += pad(hours) + ":" + pad(minutes) + ":" + pad(secs);

	return result;
}
/*-----------------------------------------------------------------------------------*/    
function autoFitText() {
  var minSize = 20;
  var maxSize = 50;
  var el = document.getElementById("lblInfoAutoClose");
  var size = maxSize;
  el.style.fontSize = size + "px";
  while ((el.scrollWidth > el.offsetWidth) && (size > minSize)) {
    size--;
    el.style.fontSize = size + "px";
  }
}
/*-----------------------------------------------------------------------------------*/
function sendQuickAct (varParDataJS) {
  if (!varParDataJS || Object.keys(varParDataJS).length === 0) {
    if (DEBUG) console.log("sendQuickAct:", "err: no object to send!");
    return;
  }
  var _js = JSON.stringify(varParDataJS);
  if (DEBUG) console.log("send->", _js);
  if (websck_is_connected) websocket.send(_js);
  _js	= null; data = null;
};
/*-----------------------------------------------------------------------------------*/
$("#force24Thermo").on("change", function(e) {
  var mode = $(this).is(":checked");
  var data = {
    "THERMOSTATFORCE24": mode
  };
  sendQuickAct(data);
  sndBtnClick.play();
});
/*-----------------------------------------------------------------------------------*/
$("#idClimaForced").on("change", function(e) {
  var mode = $(this).is(":checked");
  if (mode) mode = 10; else mode = 255;
  var data = {
    "CLIMA_MODE": mode
  };
  sendQuickAct(data);
  sndBtnClick.play();
});
/*-----------------------------------------------------------------------------------*/
function parseParamThermo(_jsonData) {
  if (_jsonData == null) return;
  var qckThermoData = _jsonData["QUICK_THERMO"];
  $("#force24Thermo").prop('checked',qckThermoData["THERMOSTATFORCE24"]);
  $("#idClimaForced").prop('checked',qckThermoData["CLIMA_MODE"]);

  $("#THERMOSTAT").html(qckThermoData["THERMOSTAT"].toFixed(2));
  $("#TEMP_DORMITOR").html(qckThermoData["TEMP_DORMITOR"].toFixed(2));
  $("#TEMP_DORMITOR2").html(qckThermoData["TEMP_DORMITOR2"].toFixed(2));
  $("#TEMP_HOL").html(qckThermoData["TEMP_HOL"].toFixed(2));
  $("#TEMP_EXTERN").html(qckThermoData["TEMP_EXTERN"].toFixed(2));
  $("#MATRIX_INDOOR").html(qckThermoData["MATRIX_INDOOR"].toFixed(2));
  $("#THERMOSTAT").html(qckThermoData["THERMOSTAT"].toFixed(2));
  $("#CentralaOn").html((qckThermoData["CentralaOn"]?"DA":"NU"));
  $("#ClimaON").html((qckThermoData["ClimaOn"]?"DA":"NU"));
  $("#TEMP_INDOOR_CALCULATION_METHOD").html(qckThermoData["TEMP_INDOOR_CALCULATION_METHOD"]);
  
  $("#TURBO_HEAT_REM_TIME").html(secToDateTimeStr(qckThermoData["TURBO_HEAT_REM_TIME"]));
  $("#FORCED_CLIMA_REM_TIME").html(secToDateTimeStr(qckThermoData["FORCED_CLIMA_REM_TIME"]));
  $('#idPlsWait').addClass('hidden'); // hide Loading
}
/*-----------------------------------------------------------------------------------*/
function onVisibilityChange() {
  ERROR_INSTANCE = 1;
  websocket.close();
  location.replace("/protection");
}
/*-----------------------------------------------------------------------------------*/
function forceToEnableSND () {
  if (EN_SOUND) return;
  if (DEBUG) console.log("Try to enable SND...");
  showInfoAutoClose(30, false, "Activati sunetul in sistem pentru Alerte",
    function() {
      /*OK BTN*/
      sndBtnClick.play();
      sndBtnClick.pause();
      myfavInfo.play();
      myfavInfo.pause();
      EN_SOUND = true;
      if (DEBUG) console.log("Enable SND in SYSTEM");
    }, null
  );

  setTimeout(function() {
    forceToEnableSND();
  }, 60000);
}
/*-----------------------------------------------------------------------------------*/
function LoadERRLST_EXTERMAL() {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://mellbo.github.io/upx-repo/SMARTHOME-REPO/web-repo/assets/js/ERRLST.lst", false);
    xhr.send(null);
    if (xhr.status === 200) {
      var text = xhr.responseText;
      ERRLST_EXTERMAL = (new Function("return " + text))();
      if (DEBUG) console.log("ERRLST_EXTERMAL Loaded OK");
    } else {
      if (DEBUG) console.log("ERRLST_EXTERMAL: can`t load");
      return;
    }
  } catch (e) {
    if (DEBUG) console.log("ERRLST_EXTERMAL Err: ", e.message);
    return;
  }
}
/*-----------------------------------------------------------------------------------*/
function checkDevice() {
  if (window.oldDevice  === false) return;
  $(".clsDevForOld").addClass("clsDevOld disabled").find("a").on("click", function(e) {
    e.preventDefault(); 
  });
}
/*-----------------------------------------------------------------------------------*/
/*
  o use with: info.play();
  Encodere online:
    o https://base64.guru/converter/encode/audio
    o https://base64.online/encoders/encode-audio-to-base64
    o https://codebeautify.org/audio-to-base64-converter
*/
  // LOAD SOUND BASE
  setTimeout(function() {
      var snd = document.createElement("script");
      snd.src = "https://mellbo.github.io/upx-repo/SMARTHOME-REPO/web-repo/assets/js/sound_library.js";
      document.body.appendChild(snd);
      snd.onload = function() {
        if (DEBUG) console.log("sound_library OK");
        forceToEnableSND();
      };
  }, 1000); // delay 2000 ms
/*------------------------------------------------------------------------------------*/