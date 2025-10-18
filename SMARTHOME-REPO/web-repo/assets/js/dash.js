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
/*
const LIVE_DATA_TYPE = 1; // index.html - live_data
const GET_DATA_TYPE  = 2; // settings.html - SYSTEM
const GET_DATA_QUICK = 3; // setings.html - qck_set_fdbck
const GET_DATA_LOGS  = 4; // logs.html
const ONLY_PING = 254;
    //ERROR_INSTANCE = 255 but not use from script->esp
*/
var GET_DATA_SUMAR = 5; // dashboard.html

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

    $('#idPlsWait').removeClass('hidden'); //show Loading
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
  console.log('Connection opened');
}
/*-----------------------------------------------------------------------------------*/
function onCloseWS(event) {
  websck_is_connected = 0;
  console.log('Connection closed');
  if (!ERROR_INSTANCE) setTimeout(initWebSocket, 2000); //retry websocket
}
/*-----------------------------------------------------------------------------------*/
function initWebSocket() {
  console.log('Trying to open a WebSocket connection...');
  websocket = new WebSocket(gateway);
  websocket.onopen    = onOpenWS;
  websocket.onclose   = onCloseWS;
  websocket.onmessage = onMessageWS;
}
/*-----------------------------------------------------------------------------------*/
/*update fields*/
function onMessageWS(event) {
  var jsonObject = JSON.parse(event.data);
    //console.log(jsonObject);
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

  if (PAGENAME == 'dashboard') {
    if (jsonObject.hasOwnProperty("live_data") == true)
        parseDashParamIndex(jsonObject);
  }

	jsonObject = null;
}
/*-----------------------------------------------------------------------------------*/
function pool_info_page() {
  if ((ERROR_INSTANCE) || (!websck_is_connected)) return;
  var data = {
    "REQUEST_INFO": GET_DATA_SUMAR
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
      console.log('Rebooting WebPage');
    break;
    case false:
      $('#idNoConnexion').addClass('hidden');
    break;
  }
}
/*-----------------------------------------------------------------------------------*/
var confirmTimerId = null;
function showConfirm(autoCloseSec, msg, callbackOk, callbackCancel) {
    if (confirmTimerId) {
        clearInterval(confirmTimerId);
        confirmTimerId = null;
    }

    var btnOk = document.getElementById("modalOk");
    var btnCancel = document.getElementById("modalCancel");
    var modalMsg = document.getElementById("modalMsg");
    modalMsg.innerHTML = msg;
    autoFitText();

    if (callbackCancel === null) {
        btnCancel.classList.add('hidden');
    } else {
        btnCancel.classList.remove('hidden');
    }

    $('#modalConfirm').modal('show');

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

    if (EN_SOUND) confirm_alert.play();

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
        $('#modalConfirm').modal('hide');
        if (callbackOk) callbackOk();
    }

    function cancelHandler() {
        cleanup();
        $('#modalConfirm').modal('hide');
        if (callbackCancel) callbackCancel();
    }

    btnOk.addEventListener("click", okHandler);
    btnCancel.addEventListener("click", cancelHandler);
}
/*-----------------------------------------------------------------------------------*/
function autoFitText() {
  var minSize = 20;
  var maxSize = 50;
  var el = document.getElementById("modalMsg");
  var size = maxSize;
  el.style.fontSize = size + "px";
  while ((el.scrollWidth > el.offsetWidth) && (size > minSize)) {
    size--;
    el.style.fontSize = size + "px";
  }
}
/*-----------------------------------------------------------------------------------*/
//-->>
/*-----------------------------------------------------------------------------------*/
function getWeatherIconFile(idx, forceNight=false) {
  const mainLink = "https://mellbo.github.io/upx-repo/SMARTHOME-REPO/web-repo/assets/img/weather-icon/";
	const numericIdx = Number(idx);
	const prfxnight = forceNight ? "_n" : "";

	const ranges = [
		{min: 3, max: 4, file: 'furtuna'},            // ploaie/ninsoare
		{min: 5, max: 10, file: 'ninsoare_ploaie'},   // ploaie/ninsoare
		{min: 11, max: 14, file: 'adverse'},          // adverse
		{min: 16, max: 16, file: 'ninsoare'},         // ninsoare
		{min: 20, max: 20, file: 'ceata'},            // ceata
		{min: 26, max: 28, file: 'innorat'},          // innorat
		{min: 29, max: 30, file: 'insorit'},          // insorit
		{min: 31, max: 34, file: 'senin'},            // senin
		{min: 37, max: 38, file: 'vanturi'},          // vanturi
		{min: 39, max: 45, file: 'ploaie'},           // ploaie
		{min: 46, max: 47, file: 'wic_thunder'}       // wic_thunder
	];

	let file = 'wic_unknow.png'; // default UNKNOWN

	if (numericIdx === 0) { // insorit
		file = 'wic_unknow.png';
	} else {
		for (let r of ranges) {
			if (numericIdx >= r.min && numericIdx <= r.max) {
				file = r.file + prfxnight + '.png';
				break; // ieșim din loop după primul match
			}
		}
	}

	return mainLink + file; // o singură ieșire
}

function parseJsonWeatherObj(js) { // aici js este array-ul deja pars
	let json_out = {};

	function formatDelphiDate(dateStr) {
		const d = new Date(dateStr);
		const pad = (n) => (n < 10 ? '0' + n : n);
		const offset = 2; 
		const hours = d.getUTCHours() + offset;
		return d.getUTCFullYear() + '-' +
			   pad(d.getUTCMonth() + 1) + '-' +
			   pad(d.getUTCDate()) + 'T' +
			   pad(hours) + ':' +
			   pad(d.getUTCMinutes()) + ':' +
			   pad(d.getUTCSeconds()) + '+02:00';
	}

	try {
		json_out.dayCount = js.length;

		for (let i = 0; i < js.length; i++) {
			const dayObj = js[i];
			const dayData = {};

			dayData.validDate = formatDelphiDate(dayObj.validDate);
			dayData.sunrise = formatDelphiDate(dayObj.sunrise);
			dayData.sunset = formatDelphiDate(dayObj.sunset);
			dayData.dayName = dayObj.day.dayPartName;
			dayData.nightName = dayObj.night.dayPartName;
			dayData.dayTemp = dayObj.day.temperature;
			dayData.nightTemp = dayObj.night.temperature;
			dayData.iconDay = String(dayObj.day.icon);
			const icon_day = dayData.iconDay;
			dayData.iconNight = String(dayObj.night.icon);
			const icon_night = dayData.iconNight;
			dayData.phraseDay = dayObj.day.phrase;
			const icn_lbl_day = dayData.phraseDay;
			dayData.phraseNight = dayObj.night.phrase;
			const icn_lbl_night = dayData.phraseNight;
			dayData.day = dayObj.day.narrative;
			dayData.night = dayObj.night.narrative;

			json_out[`Day${i}`] = dayData;
		}
	} catch (err) {
		console.error(err);
		return null;
	}

	return json_out;
}




function loadWeather(){
  const hours = new Date();
  var jsonWeather;
  $.get("http://upx83.go.ro/upx-center/wheather/upx-weather.json", function(response) {
    //jsonWeather = JSON.parse(response);
    jsonWeather = parseJsonWeather(response);
    /*Weather page*/
  const sunrise = new Date(jsonWeather.Day0['sunrise']);
  const sunset = new Date(jsonWeather.Day0['sunset']);
  const isDayTime = ((hours > sunrise) && (hours < sunset));

    if (isDayTime == true) {
      $("#weatherTodayDate").html('<i class="fas fa-sun" id="weatherTodayDateIcon" style="font-size: 17px; margin: 11px;"></i>'+jsonWeather.Day0['dayName']);
      $("#weatherTodayDayNarative").html(jsonWeather.Day0['day']);
      $("#weatherTodayIcon").attr('src', getWeatherIconFile(jsonWeather.Day0['iconDay']));
    } else {
      $("#weatherTodayDate").html('<i class="fas fa-moon" id="weatherTodayDateIcon" style="font-size: 17px; margin: 11px;"></i>'+jsonWeather.Day0['nightName']);
      $("#weatherTodayDayNarative").html(jsonWeather.Day0['night']);
      $("#weatherTodayIcon").attr('src', getWeatherIconFile(jsonWeather.Day0['iconNight']), true);
    }

    $("#weatherTodayTempDay").html(jsonWeather.Day0['dayTemp']);
    $("#weatherTodayTempNight").html(jsonWeather.Day0['nightTemp']);

    $("#weatherday1std").html(jsonWeather.Day1['dayName']);
    $("#weatherday2std").html(jsonWeather.Day2['dayName']);
    $("#weatherday3std").html(jsonWeather.Day3['dayName']);
    $("#weatherday4std").html(jsonWeather.Day4['dayName']);

    $("#weatherDate1std").html(jsonWeather.Day1['validDate']);
    $("#weatherDate2std").html(jsonWeather.Day2['validDate']);
    $("#weatherDate3std").html(jsonWeather.Day3['validDate']);
    $("#weatherDate4std").html(jsonWeather.Day4['validDate']);

    $("#narrative1Std").html(jsonWeather.Day1['phraseDay']);
    $("#narrative2Std").html(jsonWeather.Day2['phraseDay']);
    $("#narrative3Std").html(jsonWeather.Day3['phraseDay']);
    $("#narrative4Std").html(jsonWeather.Day4['phraseDay']);

    $("#temp1Std").html(jsonWeather.Day1['dayTemp']+'º');
    $("#temp2Std").html(jsonWeather.Day2['dayTemp']+'º');
    $("#temp3Std").html(jsonWeather.Day3['dayTemp']+'º');
    $("#temp4Std").html(jsonWeather.Day4['dayTemp']+'º');


    $("#icon1Std").attr('src', getWeatherIconFile(jsonWeather.Day1['iconDay']));
    $("#icon2Std").attr('src', getWeatherIconFile(jsonWeather.Day2['iconDay']));
    $("#icon3Std").attr('src', getWeatherIconFile(jsonWeather.Day3['iconDay']));
    $("#icon4Std").attr('src', getWeatherIconFile(jsonWeather.Day4['iconDay']));
  });
}
/*-----------------------------------------------------------------------------------*/
function parseDashParamIndex(_jsonData) {
  if (_jsonData == null) return;
  var DaSauNu = "";
  var live_data = _jsonData["live_data"];
  var blinkClass = "";

  /*page1*/
  $("#lbl_dormitor_temp").html(live_data["TEMP_DORMITOR"]+'<label>ºC</label>');
  $("#lbl_dormitor2_temp").html(live_data["TEMP_DORMITOR2"]+'<label>ºC</label>');
  $("#lbl_living_temp").html(live_data["TEMP_HOL"]+'<label>ºC</label>');
  $("#lbl_ext_temp").html(live_data["TEMP_EXTERN"]+'<label>ºC</label>');
  //$("#lbl_matrix_temp").html(live_data["MATRIX_INDOOR"]+'<label>ºC</label>');
  $("#lbl_matrix_temp").html(temp_resimtita(parseFloat(live_data["MATRIX_INDOOR"]), parseFloat(live_data["HOL_HUMIDITY"]), 0.2)+'<label>ºC</label>');
  $("#lbl_thermostatset_temp").html(live_data["THERMOSTAT"]+'<label>ºC</label>');

  //indicator heating
  if (live_data["CentralaOn"] == false) {
    $("#heaton_icon").addClass("invisible");
  } else {
    $("#heaton_icon").removeClass("invisible");
  }

  /*page 2*/
  blinkClass = checkValueForBlink(live_data["CALOR1_VCC"],2100,3300);
  $("#CALOR1_VCC").html('<div class="'+blinkClass+'">'+live_data["CALOR1_VCC"]+'mV</div>');
  blinkClass = checkValueForBlink(live_data["CALOR2_VCC"],2100,3300);
  $("#CALOR2_VCC").html('<div class="'+blinkClass+'">'+live_data["CALOR2_VCC"]+'mV</div>');
  blinkClass = checkValueForBlink(live_data["CALOR3_VCC"],2100,3300);
  $("#CALOR3_VCC").html('<div class="'+blinkClass+'">'+live_data["CALOR3_VCC"]+'mV</div>');
  blinkClass = checkValueForBlink(live_data["CALOR4_VCC"],2100,3300);
  $("#CALOR4_VCC").html('<div class="'+blinkClass+'">'+live_data["CALOR4_VCC"]+'mV</div>');
  blinkClass = checkValueForBlink(live_data["CALOR5_VCC"],2100,3300);
  $("#CALOR5_VCC").html('<div class="'+blinkClass+'">'+live_data["CALOR5_VCC"]+'mV</div>');
  blinkClass = checkValueForBlink(live_data["CALOR6_VCC"],2100,3300);
  $("#CALOR6_VCC").html('<div class="'+blinkClass+'">'+live_data["CALOR6_VCC"]+'mV</div>');

  $("#CALOR1_CUR_STATE").html(decodeCalorMode(live_data["CALOR1_CUR_STATE"]));
  $("#CALOR2_CUR_STATE").html(decodeCalorMode(live_data["CALOR2_CUR_STATE"]));
  $("#CALOR3_CUR_STATE").html(decodeCalorMode(live_data["CALOR3_CUR_STATE"]));
  $("#CALOR4_CUR_STATE").html(decodeCalorMode(live_data["CALOR4_CUR_STATE"]));
  $("#CALOR5_CUR_STATE").html(decodeCalorMode(live_data["CALOR5_CUR_STATE"]));
  $("#CALOR6_CUR_STATE").html(decodeCalorMode(live_data["CALOR6_CUR_STATE"]));

  $("#CALOR1_SET_STATE").html(decodeCalorMode(live_data["CALOR1_SET_STATE"]));
  $("#CALOR2_SET_STATE").html(decodeCalorMode(live_data["CALOR2_SET_STATE"]));
  $("#CALOR3_SET_STATE").html(decodeCalorMode(live_data["CALOR3_SET_STATE"]));
  $("#CALOR4_SET_STATE").html(decodeCalorMode(live_data["CALOR4_SET_STATE"]));
  $("#CALOR5_SET_STATE").html(decodeCalorMode(live_data["CALOR5_SET_STATE"]));
  $("#CALOR6_SET_STATE").html(decodeCalorMode(live_data["CALOR6_SET_STATE"]));

  /*page3*/
  $("#lbl_umid_exterior").html(live_data["HUMIDITY_EXT"]+'<label>%</label>');
  $("#lbl_umid_interior").html(live_data["HOL_HUMIDITY"]+'<label>%</label>');
  $("#lbl_jal_raw").html(live_data["jalAutoModeRun"]+'<label>lx</label>');
  $("#lbl_jalmode").html(decodeJalModeNow(live_data["jalModeNow"]));
  $("#lbl_ldr_exterior").html(live_data["outdoorLDR"]+'<label>LX</label>');
  $("#lbl_ldr_interior").html(live_data["dormitorLDR"]+'<label>LX</label>');

  /*page4*/
  $("#lbl_battery").html(live_data["VOLTAGE_BATTERY"]+'<label>V</label>');
  $("#lbl_12V").html(live_data["VOLTAGE_RAIL12"]+'<label>V</label>');
  $("#lbl_mainsupply").html(live_data["VOLTAGE_MAIN"]+'<label>V</label>');
  $("#totalHeatTime").html(live_data["totalHeatTime"]);
  $("#lastHeatTime").html(live_data["tmLstHeatChg"]);
  $("#heatingState").html((live_data["CentralaOn"]?"ON":"OFF"));

  $('#idPlsWait').addClass('hidden'); // hide Loading
}
/*-----------------------------------------------------------------------------------*/
function decodeJalModeNow(mode) {
    switch(mode){
        case 0:
            return 'MANUAL';
        break;

        case 1:
            return 'AUTO';
        break;

        case 2:
            return 'USER LDR';
        break;

        default:
            return mode;
        break;

    }
}
/*-----------------------------------------------------------------------------------*/
function decodeCalorMode(mode){
	switch(mode){
		case 0:
			return '<div>NEDEFINIT</div>';
		break;

		case 1:
			return '<div class="green">DESCHIS</div>';
		break;

		case 2:
			return '<div class = "red">INCHIS</div>';
		break;
	}
}
/*-----------------------------------------------------------------------------------*/
$("#btn_turbo").on("click",function(e){
   //UpdateSettings();
   setInterval(function() {
    showConfirm(10,
        "Aceasta este o alerta <br> Acesta este randul doi<br>Randul trei", null, null);
   }, 20000);
});
/*-----------------------------------------------------------------------------------*/
function checkValueForBlink(value,minVal,MaxVal) {
    var fVal = parseFloat(value);
    if ((fVal < minVal) || (fVal > MaxVal)) {
        return 'blink';
    } else {
        return '';
    }
}
/*-----------------------------------------------------------------------------------*/
function temp_resimtita(temp,hum,wspeed) {
	var calc_temp = "N/A";
	calc_temp = parseFloat((temp + 0.33*(hum/100.0)*6.105*Math.exp(17.27*temp/(237.7+temp))- 0.70*wspeed - 4.00)).toFixed(2);
	return calc_temp;
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
  console.log("Try to enable SND...");
  showConfirm(30, "Activati sunetul in sistem pentru Alerte",
    function() {
      /*OK BTN*/
      info.play();
      info.pause();
      short_info.play();
      short_info.pause();
      confirm_alert.play();
      confirm_alert.pause();
      EN_SOUND = true;
      console.log("Enable SND in SYSTEM");
    }, null
  );
  
  setTimeout(function() {
    forceToEnableSND();
  }, 60000);
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
        console.log("sound_library OK");
        forceToEnableSND();
        loadWeather();
      };
  }, 1000); // delay 2000 ms
/*------------------------------------------------------------------------------------*/