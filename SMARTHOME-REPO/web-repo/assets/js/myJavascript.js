/*SECTION UPDATE livePARAM*/
var PAGENAME = '';
var AddNewTemperatureInMonth = '';
var resetThermostat = 0;
var PREFERED_LIGHT_DORMITOR = 0;
var LAST_OUTDOOR_LDR = 0;
var idleTime = 0;
var THERMOSTATLAST = '';
var timers = [];
var intervals = [];
/*ESP WebSocket*/
var gateway = window.location.port 
  ? `ws://${window.location.hostname}:${window.location.port}/ws` 
  : `ws://${window.location.hostname}/ws`;  
var websocket;
var websck_is_connected = false;
var millis_esp = 0;
var ERROR_INSTANCE = 0;
var paginaVizibila = true;
 
 /*
 This var must be same in Arduino header.h
*/
 
function onVisibilityChange() {
  paginaVizibila = !document.hidden;
  ERROR_INSTANCE = 1;
  websocket.close();
  location.replace("/protection");
} 
 
$(document).ready(function() {
    initWebSocket(); //ESP WebSocket  
    PAGENAME = window.location.pathname;
    PAGENAME = PAGENAME.split("/").pop();
		if (PAGENAME == '') PAGENAME = 'index';
    
    if ((!checkIfMobile()) && 
        ((PAGENAME == 'index') || (PAGENAME == 'logs'))
        ) loadNewBackGround();

    if (PAGENAME == 'settings') {
      inject_function_settings();      
      loadCalendar(); 
    }
	
    if (PAGENAME == 'logs') {
      getLogs('readInfo');
      getLogs('readWarning');
      getLogs('readError');
      getLogs('readKeys'); 
	}
 
    setInterval(timerIncrement, 60000); // force refresh in timerIncrement
    $(this).mousemove(function (e) {
        idleTime = 0;
    });
    $(this).keypress(function (e) {
        idleTime = 0;
    });    
	
  // detection visibility
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("beforeunload", () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
  });    
}); //end onLoad		

/*ESP WebSocket*/
/*------------------------------------------------------------------------------------*/
  function onOpen(event) {
    websck_is_connected = 1;  
		if (PAGENAME == 'settings') {
      verificaVersiune();
      getSettingsDataCmd();  // pool_info_page() delayed included here
    } else {
      pool_info_page(); //pool now   
    }
    setTimeout(function() {
      checkMillis();
    }, 8000);    
    console.log('Connection opened');
}
/*-----------------------------------------------------------------------------------*/
  function onClose(event) {
    websck_is_connected = 0;
    console.log('Connection closed');
    if (!ERROR_INSTANCE) setTimeout(initWebSocket, 2000); //retry websocket
  }
/*-----------------------------------------------------------------------------------*/
  function initWebSocket() {
    console.log('Trying to open a WebSocket connection...');
    websocket = new WebSocket(gateway);
    websocket.onopen    = onOpen;
    websocket.onclose   = onClose;
    websocket.onmessage = onMessage;
  }
/*-----------------------------------------------------------------------------------*/  
  /*update fields*/
function onMessage(event) {
	let jsonObject = JSON.parse(event.data);
		millis_esp = parseInt(jsonObject['cMs'], 10);
    //quick banned from server
    if (jsonObject.hasOwnProperty("ERROR_INSTANCE") == true) {
      ERROR_INSTANCE = 1;
      websocket.close();
      jsonObject = null;
      alert("You have to many page opened. Keep only one in your in browser or slow down action!");
      location.replace("/protection");
      return;
    }
    
    let el = document.getElementById("idcMillis");
    if (el) el.innerText = millis_esp;
    
    if (PAGENAME == 'index') {
      updLiveParamIndex(jsonObject);
    }
    
    if (PAGENAME == 'settings') {
      LAST_OUTDOOR_LDR = jsonObject["dormitorLDR"];
      $("#dormitorLDR").html(LAST_OUTDOOR_LDR);
      console.log(LAST_OUTDOOR_LDR);
      if (jsonObject.hasOwnProperty("settings_data") == true) parseSettings(jsonObject);
    }    
		jsonObject = null;
}
/*-----------------------------------------------------------------------------------*/
async function verificaVersiune() {
	let VERSION = '';
    const versionElement = document.getElementById("idVersion");
    if (versionElement) {
        VERSION = versionElement.innerHTML.trim();
    } else return;
		  
    const dataRaw = await fetch('https://mellbo.github.io/upx-repo/VPS-UART/firmware/version');
    const data = await dataRaw.text();
    const ini = Object.fromEntries(
        data.split('\n').map(line => line.split('=').map(param => param.trim()))
    );
	console.log("Check VERSION..");
    if (ini.version !== VERSION) {
		console.log("Update available!"); 
		const idNewFirmware = document.getElementById("idNewFirmware");
		if (idNewFirmware) {
			const idNewFirmwareURL = document.getElementById("idNewFirmwareURL");
			if (idNewFirmwareURL) {
				idNewFirmwareURL.href = ini.url;
				idNewFirmware.classList.remove('d-none');
			}
		}			
    } else {
		console.log("No update available"); 
	}
}
/*-----------------------------------------------------------------------------------*/
const LIVE_DATA_TYPE = 1; // index.html - LiveData
const GET_DATA_TYPE  = 2;
const ONLY_PING = 254;
      //ERROR_INSTANCE = 255 but not use from script->esp
/*-----------------------------------------------------------------------------------*/      
function getSettingsDataCmd() {
  if ((ERROR_INSTANCE) || (!websck_is_connected)) return;
  let data = {
		"REQUEST_INFO": GET_DATA_TYPE
	};
	
	let _js = JSON.stringify(data);	
  if (websck_is_connected) websocket.send(_js);
	_js	= null;
	data = null;
  setTimeout(pool_info_page, 1000); //delayed start here
}
/*-----------------------------------------------------------------------------------*/
function pool_info_page() {
  if ((ERROR_INSTANCE) || (!websck_is_connected)) return;
  let DATA_SET_TYPE = ONLY_PING;
  
  if (PAGENAME == 'index') DATA_SET_TYPE = LIVE_DATA_TYPE;
  
  let data = {
		"REQUEST_INFO": DATA_SET_TYPE
	};
	
	let _js = JSON.stringify(data);	
  if (websck_is_connected) websocket.send(_js);
	_js	= null;
	data = null;
  
  // rearm pool
  if (websck_is_connected) {
    timers.push(setTimeout(function(){
      pool_info_page();
      }, 2000));	
  }   
}
/*-----------------------------------------------------------------------------------*/
function checkMillis() {
  if (ERROR_INSTANCE) {
    return;
  }

  let currentMillis = millis_esp;
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
    timers.push(setTimeout(checkMillis, 5000)); // rearming checkMillis()
  }
}
/*-----------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------*/
/*FOR SETTINGS PAGE*/
function inject_function_settings() {
  console.log("loading action and function settings");   
  /*SET ACTION*/
  
    /* QUICK SAVING SEND */
    //set_THERMOSTAT_OUTSIDE_ENABLE
    $("#set_THERMOSTAT_OUTSIDE_ENABLE").on("change", function(e) {
      let data = {
          "THERMOSTAT_OUTSIDE_ENABLE": $('#set_THERMOSTAT_OUTSIDE_ENABLE').is(":checked")
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;          
    });
    
    //save_welcome_setup: smartWelcomeEnable & smartWelcomeAutoSetup
    $('#save_welcome_setup').on('click', function() {
      let times = [];
       times.push($('#welcome_Luni').val());
       times.push($('#welcome_Marti').val());
       times.push($('#welcome_Miercuri').val());
       times.push($('#welcome_Joi').val());
       times.push($('#welcome_Vineri').val());
       times.push($('#welcome_Sambata').val());
       times.push($('#welcome_Duminica').val());

      let data = {
          "save_welcome_setup": 1,
          "smartWelcomeEnable": $('#smartWelcomeEnable').is(":checked"),
          "smartWelcomeAutoSetup": $('#smartWelcomeAutoSetup').is(":checked"),
          "smartWelcomeTimes": times
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;
      $('#smartWelcomeWindow').removeClass('in');
    });
    
    // PREFERED_LIGHT_DORMITOR
    $('#preff_ldr').on('click', function() {
      PREFERED_LIGHT_DORMITOR = LAST_OUTDOOR_LDR;
      $('#prefLDRShow').text(PREFERED_LIGHT_DORMITOR);
      let data = {
          "PREFERED_LIGHT_DORMITOR": PREFERED_LIGHT_DORMITOR
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;   
    });
    // AICI AI RAMAS
    
    //-->
    //set_NewTEMPInCALL
    $('#set_NewTEMPInCALL').slider({
        id: 'ex1Slider', //class
        min: 5.0,
        max: 50.0,
        step: 0.1,
        value: 22.0,
        tooltip: 'yes',
        tooltip_position: 'top',
        handle: 'triangle',
        focus: false,
    });

    $("#set_NewTEMPInCALL").on("change", function(slideEvt) {
        $("#gradeCelsius").val($(this).val());
    });

    //set_CENTRALA_ON_HISTERIZIS
    $("#set_CENTRALA_ON_HISTERIZIS").slider({
        id: 'ex1Slider', //class
        min: 0.2,
        max: 5.0,
        step: 0.1,
        value: 0.2,
        tooltip: 'yes',
        tooltip_position: 'top',
        handle: 'round',
        focus: false,
    });

    $("#set_CENTRALA_ON_HISTERIZIS").on("change", function(slideEvt) {
        $("#param1Value").text($(this).val());
        $("#apply_CENTRALA_ON_HISTERIZIS").removeClass('hidden');
    });

    //set_TEMP_INDOOR_CALCULATION_METHOD
    $("#set_TEMP_INDOOR_CALCULATION_METHOD").slider({
        id: 'ex1Slider', //class
        min: 0,
        max: 5,
        step: 1,
        value: 1,
        tooltip: 'yes',
        tooltip_position: 'top',
        handle: 'round',
        focus: false,
    });
    $("#set_TEMP_INDOOR_CALCULATION_METHOD").on("change", function(slideEvt) {
        $("#param2Value").text($(this).val());
        $('#metodaCalculBtn').addClass('in');
        $("#apply_TEMP_INDOOR_CALCULATION_METHOD").removeClass('hidden');
    });

    //set_jalAutoModeRun
    $("#set_jalAutoModeRun").slider({
        id: 'ex1Slider', //class
        min: 0,
        max: 900,
        step: 1,
        value: 0,
        tooltip: 'yes',
        tooltip_position: 'top',
        handle: 'round',
        //scale: 'logarithmic',
        focus: false,
    });

    $("#set_jalAutoModeRun").on("change", function(slideEvt) {
        $("#param3Value").text($(this).val());
        $("#apply_jalAutoModeRun").removeClass('hidden');
    });

    //preset
    $("#MROFF").on("click", function(e) {
        setSlideValue("#set_jalAutoModeRun", "#param3Value", 0);
        $("#apply_jalAutoModeRun").removeClass('hidden');
    });
    $("#MRUP").on("click", function(e) {
        setSlideValue("#set_jalAutoModeRun", "#param3Value", 1);
        $("#apply_jalAutoModeRun").removeClass('hidden');
    });
    $("#MRDOWN").on("click", function(e) {
        setSlideValue("#set_jalAutoModeRun", "#param3Value", 2);
        $("#apply_jalAutoModeRun").removeClass('hidden');
    });
    $("#MRAUTOMAT").on("click", function(e) {
        setSlideValue("#set_jalAutoModeRun", "#param3Value", 3);
        $("#apply_jalAutoModeRun").removeClass('hidden');
    });
    //preset end

    //set_LowLightPoint
    $("#set_LowLightPoint").slider({
        id: 'ex1Slider', //class
        min: 0,
        max: 500,
        step: 1,
        value: 20,
        tooltip: 'yes',
        tooltip_position: 'top',
        handle: 'round',
        focus: false,
    });
    $("#set_LowLightPoint").on("change", function(slideEvt) {
        $("#param4Value").text($(this).val());
        $("#apply_LowLightPoint").removeClass('hidden');
    });

    //set_jaluzHisterizis
    $("#set_jaluzHisterizis").slider({
        id: 'ex1Slider', //class
        min: 0,
        max: 200,
        step: 1,
        value: 20,
        tooltip: 'yes',
        tooltip_position: 'top',
        handle: 'round',
        focus: false,
    });
    $("#set_jaluzHisterizis").on("change", function(slideEvt) {
        $("#param5Value").text($(this).val());
        $("#apply_jaluzHisterizis").removeClass('hidden');
    });

    //set_FunTemperatureTrigger
    $("#set_FunTemperatureTrigger").slider({
        id: 'ex1Slider', //class
        min: 20.0,
        max: 50.0,
        step: 0.25,
        value: 24.0,
        tooltip: 'yes',
        tooltip_position: 'top',
        handle: 'round',
        focus: false,
    });
    $("#set_FunTemperatureTrigger").on("change", function(slideEvt) {
        $("#param6Value").text($(this).val());
        $("#apply_FunTemperatureTrigger").removeClass('hidden');
    });

    /*SLIDERS END*/

    /*dtPicker*/
    $('.clockpicker').clockpicker({
        placement: 'right',
        align: 'right',
        autoclose: true,
        default: 'now',
        fromnow: 0,
    });


    $(".addThermostat").on("change", function(e) {
        var grade = $("#gradeCelsius").val();
        var ora = $("#dtPicker").val();
        var data = '';
        if (((ora != "") && (ora !== null)) &&
            ((grade != "") && (grade !== null))) {
            data = ora + ":00\t" + grade;
            $("#dtOut").text(data);
        } else {
            $("#dtOut").text('');
        }

    });


    //BuTTON
    $('#setLivoloTestID').keyup(function(event) {
        if (event.keyCode === 13) {
            $("#save").click();
        }
    });

    $('#gradeCelsius').keyup(function(event) {
        if (event.keyCode === 13) {
            $('#set_NewTEMPInCALL').slider('setValue', $(this).val(), true);
            $("#adaugaInThermostat").click();
        }
    });

    $('#btnKeyInfo').on('click', function() {
        getLogs('readKeys');
    });

    $('#btnLogInfo').on('click', function() {
        getLogs('readInfo');
    });

    $('#btnLogWarning').on('click', function() {
        getLogs('readWarning');
    });

    $('#btnLogError').on('click', function() {
        getLogs('readError');
    });

    $('#reload_callendar').on('click', function(e) {
        loadCalendar();
    })

    $('#del_itm_calendar').on('click', function(e) {
        deleteItmCalendar($('#selCalendarItem option:selected').val());
    })

    $("#adaugaInThermostat").on('click', function(e) {
        var newDate = $("#dtOut").text();
        if ((newDate != "") &&
            (newDate != " ") &&
            (newDate != null) &&
            (newDate != "×Completati ambele campuri.")) {
            addInCallendar(newDate);
        } else {
            $("#dtOut").html("<div style='width:400px;' class='alert alert-danger' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>×</span></button><span>Completati ambele campuri.</span></div>");
        }
    })

    $('#save').on('click', function() {
        saveSettings();
    });

    $('#reset_cal_month').on('click', function() {
        resetThermostat = 1;
        saveSettings();
        resetThermostat = 0;
    });
    $('#reset_cal_all').on('click', function() {
        resetThermostat = 2;
        saveSettings();
        resetThermostat = 0;
    });
    $("#smartWelcomeAutoSetup").on("change",function(e){
        if ($("#smartWelcomeAutoSetup").is(':checked')) {
          event.preventDefault();
          $('.smartWelcome').prop("disabled", true);
        } else {
          $('.smartWelcome').prop("disabled", false);
        }
     });
    document.getElementById('idRestoreESP').addEventListener('click', restoreESP);
    document.getElementById('idRebootESP').addEventListener('click', rebootESP);
    document.getElementById('idShutDown').addEventListener('click', PowerOff);
    document.getElementById('idBtnSafeMod').addEventListener('click', rebootInSafeMode);
} //.inject_function_settings()
/*-----------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------*/
/*FUNCTION FOR settings.html*/ 
function setSlideValue(id,idShow,value){
    if (id != null) {$(id).slider('setValue', value, true);}
    if (idShow != null) {$(idShow).text($(id).val());}    
}

function loadCalendar() {
    console.log("Load Calendar Disabled");
    return;  
	/*PRELUARE DATE*/
    var res = '';
	$.ajax({
		url: "../php/calendar_extras.php",
        type:'post',
		data: {'act':'read'},
		success: function(data) {
        $("#calendar").html(data);            
		}
	});
}

function addInCallendar(e) {
    WRN_PROFILE_DELETE = "Doriti sa adaugati in termostat, la ora "+e.replace('\t', '  temperatura de: ')+"º ?";  
    var check = confirm(WRN_PROFILE_DELETE);  
    if(check == true){ 
        AddNewTemperatureInMonth = e;
        saveSettings();
        loadCalendar(); 
    } else {
		AddNewTemperatureInMonth = '';
        $('dtOut').val('');
	}
}

function deleteItmCalendar(index) {
	/*PRELUARE DATE*/
WRN_PROFILE_DELETE = "Doriti sa stergeti "+index+" ?";  
var check = confirm(WRN_PROFILE_DELETE);  
if(check == true){
    console.log("deleteItmCalendar",index," disabled");
    return;  
    var res = '';
	$.ajax({
		url: "../php/calendar_extras.php",
        type:'post',
		data: {'act':'del','item':index},
		success: function(data) {
        $("#calendar").html(data);            
		}
	});
  }
}

function parseSettings(jsonData){
	if (jsonData == null) {return;}
  console.log(jsonData);
  
  $("#set_THERMOSTAT_OUTSIDE_ENABLE").attr('checked',jsonData.SYSTEM["THERMOSTAT_OUTSIDE_ENABLE"]);  
	$("#set_forceMainDoorOpen").attr('checked',jsonData.SYSTEM["forceMainDoorOpen"]);
	$("#set_AlowLightOFF").attr('checked',jsonData.SYSTEM["AlowLightOFF"]);
	
	$("#setKEY110_ENABLE").attr('checked',jsonData.SYSTEM["KEY110_ENABLE"]);
	$("#setKEY120_ENABLE").attr('checked',jsonData.SYSTEM["KEY120_ENABLE"]);
	$("#setKEY130_ENABLE").attr('checked',jsonData.SYSTEM["KEY130_ENABLE"]);
	$("#setKEY255_ENABLE").attr('checked',jsonData.SYSTEM["KEY255_ENABLE"]);
	
	$("#SetKEY110NAME").val(jsonData.SYSTEM["KEY110NAME"]);
	$("#SetKEY120NAME").val(jsonData.SYSTEM["KEY120NAME"]);
	$("#SetKEY130NAME").val(jsonData.SYSTEM["KEY130NAME"]);
	$("#SetKEY255NAME").val(jsonData.SYSTEM["KEY255NAME"]);
	
	$("#setLivoloTestID").val(jsonData.SYSTEM["LivoloTestID"]);    
	
	setSlideValue("#set_CENTRALA_ON_HISTERIZIS","#param1Value",jsonData.SYSTEM["CENTRALA_ON_HISTERIZIS"]);
	setSlideValue("#set_TEMP_INDOOR_CALCULATION_METHOD","#param2Value",jsonData.SYSTEM["TEMP_INDOOR_CALCULATION_METHOD"]);
	setSlideValue("#set_jalAutoModeRun","#param3Value",jsonData.SYSTEM["jalAutoModeRun"]);
	setSlideValue("#set_LowLightPoint","#param4Value",jsonData.SYSTEM["LowLightPoint"]);
	setSlideValue("#set_jaluzHisterizis","#param5Value",jsonData.SYSTEM["jaluzHisterizis"]);
	setSlideValue("#set_FunTemperatureTrigger","#param6Value",jsonData.SYSTEM["FunTemperatureTrigger"]);	
    PREFERED_LIGHT_DORMITOR = jsonData.SYSTEM["PREFERED_LIGHT_DORMITOR"];
    THERMOSTATLAST = jsonData.SYSTEM["THERMOSTAT_LAST"];
    $('#prefLDRShow').text(PREFERED_LIGHT_DORMITOR);
    $('#beepModeID').val(jsonData.SYSTEM["UserBeepMode"]);
	$('#climatizareOption').val(jsonData.SYSTEM["CLIMA_MODE"]);
    $('#force24Thermo').val(jsonData.SYSTEM["THERMOSTATFORCE24"]);
  $("#smartWelcomeEnable").attr('checked',jsonData.SYSTEM["smartWelcomeEnable"]);
  $("#smartWelcomeAutoSetup").attr('checked',jsonData.SYSTEM["smartWelcomeAutoSetup"]);
  
  $("#welcome_Luni").val(jsonData.SYSTEM["Welcome_Time"]["day1"]);
  $("#welcome_Marti").val(jsonData.SYSTEM["Welcome_Time"]["day2"]);
  $("#welcome_Miercuri").val(jsonData.SYSTEM["Welcome_Time"]["day3"]);
  $("#welcome_Joi").val(jsonData.SYSTEM["Welcome_Time"]["day4"]);
  $("#welcome_Vineri").val(jsonData.SYSTEM["Welcome_Time"]["day5"]);
  $("#welcome_Sambata").val(jsonData.SYSTEM["Welcome_Time"]["day6"]);
  $("#welcome_Duminica").val(jsonData.SYSTEM["Welcome_Time"]["day7"]);

  if ($("#smartWelcomeAutoSetup").is(':checked')) {
   event.preventDefault();
   $('.smartWelcome').prop("disabled", true);
  } else {
    $('.smartWelcome').prop("disabled", false);
  } 
}

function saveSettings() {
    let data = {
      "THERMOSTAT_OUTSIDE_ENABLE": $('#set_THERMOSTAT_OUTSIDE_ENABLE').is(":checked")
    };
    let _js = JSON.stringify(data);	
    if (websck_is_connected) websocket.send(_js);
    _js	= null;
    data = null;  
    
    console.log("Save Settings Disabled");
    return;
	var sendData = {"act":"write","SYSTEM":{
		"jalAutoModeRun":$('#set_jalAutoModeRun').val(),
		"LowLightPoint":$('#set_LowLightPoint').val(),
    "THERMOSTAT_OUTSIDE_ENABLE":$('#set_THERMOSTAT_OUTSIDE_ENABLE').is(":checked"),
		"forceMainDoorOpen":$('#set_forceMainDoorOpen').is(":checked"),
		"AlowLightOFF":$('#set_AlowLightOFF').is(":checked"),
		"jaluzHisterizis":$('#set_jaluzHisterizis').val(),
		"LivoloTestID":$('#setLivoloTestID').val(),
		"TEMP_INDOOR_CALCULATION_METHOD":$('#set_TEMP_INDOOR_CALCULATION_METHOD').val(),
		"CENTRALA_ON_HISTERIZIS":$('#set_CENTRALA_ON_HISTERIZIS').val(),
		"AddNewTemperatureInMonth":AddNewTemperatureInMonth,
		
		"KEY110_ENABLE":$('#setKEY110_ENABLE').is(":checked"),
		"KEY120_ENABLE":$('#setKEY120_ENABLE').is(":checked"),
		"KEY130_ENABLE":$('#setKEY130_ENABLE').is(":checked"),
		"KEY255_ENABLE":$('#setKEY255_ENABLE').is(":checked"),
		"SetKEY110NAME":$('#SetKEY110NAME').val(),
		"SetKEY120NAME":$('#SetKEY120NAME').val(),
		"SetKEY130NAME":$('#SetKEY130NAME').val(),
		"SetKEY255NAME":$('#SetKEY255NAME').val(),
		"FunTemperatureTrigger":$('#set_FunTemperatureTrigger').val(),
    "resetThermostat":resetThermostat,
    "PREFERED_LIGHT_DORMITOR":PREFERED_LIGHT_DORMITOR,
    "THERMOSTAT_LAST":THERMOSTATLAST,
    "UserBeepMode":$('#beepModeID').val(),
    "THERMOSTATFORCE24":$('#force24Thermo').val(),
		"CLIMA_MODE":$('#climatizareOption').val(),
    "smartWelcomeEnable":$('#smartWelcomeEnable').is(":checked"),
    "smartWelcomeAutoSetup":$('#smartWelcomeAutoSetup').is(":checked"),
    "welcome_Luni":$('#welcome_Luni').val(),
    "welcome_Marti":$('#welcome_Marti').val(),
    "welcome_Miercuri":$('#welcome_Miercuri').val(),
    "welcome_Joi":$('#welcome_Joi').val(),
    "welcome_Vineri":$('#welcome_Vineri').val(),
    "welcome_Sambata":$('#welcome_Sambata').val(),
    "welcome_Duminica":$('#welcome_Duminica').val()
	}};
    
	$.ajax({
		url: "../php/settings_param.php",
        type:'post',
		data: sendData,
		success: function(data) {
            $('#replySave').html(data);  //response   
		}
	});	    
}
/*FUNCTION REGULAR COMMON*/
function processCalorPos(id,calSt,calReq) {
 var res = "";
  if (calSt == "1") {
	 res = '<i id="'+id+'" class="icon ion-ios-flame" style="margin: 0px 5px 0px;color: #ff5c38;"></i>';
  }
  if (calSt == "2") {
	 res = '<i id="'+id+'" class="icon ion-ios-flame" style="margin: 0px 5px 0px;color: #00fff0;"></i>';	  
  }
  if (calSt != calReq) {
	res = '<i id="'+id+'" class="icon ion-ios-flame blink" style="margin: 0px 5px 0px;color: #ffcc1e;"></i>';	
  } 
  return res;
}

function updLiveParamIndex(jsonData) {
        console.log(jsonData);
				//-->UPDATE ITEMS BY ID & INI 'NAME' ITEM
        var blinkClass = "";
				var cal1St,cal1Req,cal1Vcc;
				var cal2St,cal2Req,cal2Vcc;
				var cal3St,cal3Req,cal3Vcc;
				var cal4St,cal4Req,cal4Vcc;
				var cal5St,cal5Req,cal5Vcc;
				var cal6St,cal6Req,cal6Vcc;
				 
				 cal1Req = jsonData["CALOR1_SET_STATE"];
				 cal2Req = jsonData["CALOR2_SET_STATE"];
				 cal3Req = jsonData["CALOR3_SET_STATE"];
				 cal4Req = jsonData["CALOR4_SET_STATE"];
				 cal5Req = jsonData["CALOR5_SET_STATE"];
				 cal6Req = jsonData["CALOR6_SET_STATE"];
				 
				 cal1St = jsonData["CALOR1_CUR_STATE"];
				 cal2St = jsonData["CALOR2_CUR_STATE"];
				 cal3St = jsonData["CALOR3_CUR_STATE"];
				 cal4St = jsonData["CALOR4_CUR_STATE"];
				 cal5St = jsonData["CALOR5_CUR_STATE"];
				 cal6St = jsonData["CALOR6_CUR_STATE"];
				 
				 blinkClass = checkValueForBlink(jsonData["CALOR1_VCC"],2100,3300);
				 $("#CALOR1_VCC").html('<div class="'+blinkClass+'">'+jsonData["CALOR1_VCC"]+'mV</div>');
				 blinkClass = checkValueForBlink(jsonData["CALOR2_VCC"],2100,3300);
				 $("#CALOR2_VCC").html('<div class="'+blinkClass+'">'+jsonData["CALOR2_VCC"]+'mV</div>');
				 blinkClass = checkValueForBlink(jsonData["CALOR3_VCC"],2100,3300);
				 $("#CALOR3_VCC").html('<div class="'+blinkClass+'">'+jsonData["CALOR3_VCC"]+'mV</div>');				 
				 blinkClass = checkValueForBlink(jsonData["CALOR4_VCC"],2100,3300);
				 $("#CALOR4_VCC").html('<div class="'+blinkClass+'">'+jsonData["CALOR4_VCC"]+'mV</div>');				 
				 blinkClass = checkValueForBlink(jsonData["CALOR5_VCC"],2100,3300);
				 $("#CALOR5_VCC").html('<div class="'+blinkClass+'">'+jsonData["CALOR5_VCC"]+'mV</div>');
				 blinkClass = checkValueForBlink(jsonData["CALOR6_VCC"],2100,3300);
				 $("#CALOR6_VCC").html('<div class="'+blinkClass+'">'+jsonData["CALOR6_VCC"]+'mV</div>');
				 				 
				 $("#THERMOSTAT").html(jsonData["THERMOSTAT"]);
				 $("#TEMP_BUCATARIE").html(jsonData["TEMP_BUCATARIE"]);
				 $("#TEMP_DORMITOR").html('<div>'+jsonData["TEMP_DORMITOR"]+'&nbsp;&nbsp;'+processCalorPos("cal6",cal5St,cal5Req)+'</div>');
				 
         blinkClass = checkValueForBlink(jsonData["HUM_DORMITOR2"],20,65);
				 $("#TEMP_DORMITOR2").html('<div class="'+blinkClass+'">'+jsonData["TEMP_DORMITOR2"]+
										   '&nbsp;&nbsp;<i class="icon ion-waterdrop"></i>'+jsonData["HUM_DORMITOR2"] +
										   '%&nbsp;&nbsp;'+processCalorPos("cal5",cal6St,cal6Req)+'</div>');				 
				 
         blinkClass = checkValueForBlink(jsonData["HOL_HUMIDITY"],20,65);
				 $("#TEMP_HOL").html('<div class="'+blinkClass+'">'+jsonData["TEMP_HOL"]+
									 '&nbsp;&nbsp;<i class="icon ion-waterdrop"></i>'+jsonData["HOL_HUMIDITY"] +
									 '%&nbsp;&nbsp;'+processCalorPos("cal1",cal1St,cal1Req)+processCalorPos("cal2",cal2St,cal2Req)+
									 processCalorPos("cal3",cal3St,cal3Req)+
									 processCalorPos("cal4",cal4St,cal4Req)+'</div>');
									 
				 $("#TEMP_EXTERN").html(jsonData["TEMP_EXTERN"]+'&nbsp;&nbsp;<i class="icon ion-waterdrop"></i>'+jsonData["HUMIDITY_EXT"] + '%');
				 blinkClass = checkValueForBlink(jsonData["VOLTAGE_BATTERY"],12.0,13.9);
				 $("#VOLTAGE_BATTERY").html('<div class="'+blinkClass+'">'+jsonData["VOLTAGE_BATTERY"]+'</div>');
				 blinkClass = checkValueForBlink(jsonData["VOLTAGE_RAIL12"],11.8,12.5);
				 $("#VOLTAGE_RAIL12").html('<div class="'+blinkClass+'">'+jsonData["VOLTAGE_RAIL12"]+'</div>');				 				 				 
				 blinkClass = checkValueForBlink(jsonData["VOLTAGE_MAIN"],14.9,15.6);
				 $("#VOLTAGE_MAIN").html('<div class="'+blinkClass+'">'+jsonData["VOLTAGE_MAIN"]+'</div>');
				 
				 $("#CentralaOn").html((jsonData["CentralaOn"]?"DA":"NU") + ' de ' + jsonData["IncalzireSecondsLastState"]);
				 $("#ClimaON").html((jsonData["ClimaOn"]?"DA":"NU"));				 
				 $("#jalAutoModeRun").html(decodeJalAutoMode(jsonData["jalAutoModeRun"]));
				 $("#LowLightPoint").html(jsonData["LowLightPoint"]);		
         $("#AlowLightOFF").html((jsonData["AlowLightOFF"]?"DA":"NU"));
				 $("#HomeIsAlone").html((jsonData["HomeIsAlone"]?"DA":"NU"));
				 $("#jaluzHisterizis").html(jsonData["jaluzHisterizis"]);
    
				 blinkClass = checkValueForBlink(jsonData["KEY110BATTERY"],2.75,3.30);
				 $("#KEY110BATTERY").html('<div class="'+blinkClass+'">'+jsonData["KEY110BATTERY"]+'</div>');				 				 
				 $("#KEY110CONTOR").html(jsonData["KEY110CONTOR"]);
				 $("#KEY110LASTSEEN").html(jsonData["KEY110LASTSEEN"]);
				 $("#KEY110ENABLE").html((jsonData["KEY110ENABLE"]?"DA":"NU"));
				 $("#KEY110HOME").html((jsonData["KEY110HOME"]?"DA":"NU") +', de '+jsonData['KEY110LASTCHANGE']);
				 $("#KEY110NAME").html(jsonData["KEY110NAME"]);

				 blinkClass = checkValueForBlink(jsonData["KEY120BATTERY"],2.75,3.30);
				 $("#KEY120BATTERY").html('<div class="'+blinkClass+'">'+jsonData["KEY120BATTERY"]+'</div>');					 
				 $("#KEY120CONTOR").html(jsonData["KEY120CONTOR"]);
				 $("#KEY120LASTSEEN").html(jsonData["KEY120LASTSEEN"]);
				 $("#KEY120ENABLE").html((jsonData["KEY120ENABLE"]?"DA":"NU"));
				 $("#KEY120HOME").html((jsonData["KEY120HOME"]?"DA":"NU") +', de '+jsonData['KEY120LASTCHANGE']);
				 $("#KEY120NAME").html(jsonData["KEY120NAME"]);

				 blinkClass = checkValueForBlink(jsonData["KEY130BATTERY"],2.75,3.30);
				 $("#KEY130BATTERY").html('<div class="'+blinkClass+'">'+jsonData["KEY130BATTERY"]+'</div>'); 
				 $("#KEY130CONTOR").html(jsonData["KEY130CONTOR"]);
				 $("#KEY130LASTSEEN").html(jsonData["KEY130LASTSEEN"]);
				 $("#KEY130ENABLE").html((jsonData["KEY130ENABLE"]?"DA":"NU"));
				 $("#KEY130HOME").html((jsonData["KEY130HOME"]?"DA":"NU") +', de '+jsonData['KEY130LASTCHANGE']);
				 $("#KEY130NAME").html(jsonData["KEY130NAME"]);

				 blinkClass = checkValueForBlink(jsonData["KEY255BATTERY"],2.75,3.30);
				 $("#KEY255BATTERY").html('<div class="'+blinkClass+'">'+jsonData["KEY255BATTERY"]+'</div>'); 				 
				 $("#KEY255CONTOR").html(jsonData["KEY255CONTOR"]);
				 $("#KEY255LASTSEEN").html(jsonData["KEY255LASTSEEN"]);
				 $("#KEY255ENABLE").html((jsonData["KEY255ENABLE"]?"DA":"NU"));
				 $("#KEY255HOME").html((jsonData["KEY255HOME"]?"DA":"NU") +', de '+jsonData['KEY255LASTCHANGE']);
				 $("#KEY255NAME").html(jsonData["KEY255NAME"]);
    
				 $("#TEMP_INDOOR_CALCULATION_METHOD").html(jsonData["TEMP_INDOOR_CALCULATION_METHOD"]);
				 $("#CENTRALA_ON_HISTERIZIS").html(jsonData["CENTRALA_ON_HISTERIZIS"]);
				 $("#THERMOSTAT_OUTSIDE_ENABLE").html((jsonData["THERMOSTAT_OUTSIDE_ENABLE"]?"DA":"NU"));
				 $("#ThisUpdateTime").html(jsonData["ThisUpdateTime"]);
				 $("#TEMP_GATEWAY").html(jsonData["TEMP_GATEWAY"]);
				 $("#TEMP_MATRIX").html((temp_resimtita(parseFloat(jsonData["MATRIX_INDOOR"]), parseFloat(jsonData["HOL_HUMIDITY"]), 0.2))).toString();
				 $("#jalModeNow").html(decodeJalModeNow(jsonData["jalModeNow"]));
				 $("#outdoorLDR").html(jsonData["outdoorLDR"]);
				 $("#dormitorLDR").html(jsonData["dormitorLDR"]);
         LAST_OUTDOOR_LDR = jsonData["dormitorLDR"];
				 $("#MATRIX_INDOOR").html(jsonData["MATRIX_INDOOR"]);
				 $("#jalAutoModeRunDSP").html(jsonData["jalAutoModeRun"]);    
         $("#updateTime").text(jsonData["ThisUpdateTime"]);
}

function getLogs(type) {
    console.log("getLogs:",type," disabled");
    return;
    
    var sendData = {'act':type};
	$.ajax({
		url: "../php/getLogs.php",
        type:'post',
		data: sendData,
		success: function(data) {
            updateLogsInForm(type,data);  //response             
		}
	});	 
}

function updateLogsInForm(type,htmlCode) {
    switch (type) {
        case 'readInfo':            
             $('#idLogInfo').html(htmlCode);
        break;
           
        case 'readWarning':
            $('#idLogWarning').html(htmlCode);
        break;
            
        case 'readError':
             $('#idLogError').html(htmlCode);
        break;

        case 'readKeys':            
             $('#idKeyInfo').html(htmlCode);
        break;            
            
        default:
            //
        break;
    }    
}

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

function decodeJalAutoMode(mod) {
    switch(mod){
        case 0:
            return 'STOP';
            break;
        case 1:
            return 'OPEN MAX';
            break;
        case 2:
            return 'CLOSE MAX';
            break;
        case 3:
            return 'SYSTEM';
            break;
            
        default:
            return 'POSITION';
            break;
            
    }
}

function timerIncrement() {
    idleTime = idleTime + 1;
    if (idleTime > 30) { // 30 minutes
        idleTime = 0;
        window.location.reload(true);
    }
    if (idleTime > 10) {
        $("body").css({'overflow': 'hidden'});
    } else {
        $("body").css({'overflow': 'auto'});
    }
}

function checkValueForBlink(value,minVal,MaxVal) {
    var fVal = parseFloat(value);
    if ((fVal < minVal) || (fVal > MaxVal)) {
        return 'blink';
    } else {
        return '';
    }
}

function checkIfMobile() {
    var viewport = $('.xyzzy:visible').attr('data-size');
        if( viewport == 'xs' ) {
            $('#interfaceContainer').removeClass('home-product');
            $('#sumarID').addClass('hidden');
            return true;
        } else {
          return false;
        }
}

function temp_resimtita(temp,hum,wspeed) {
	var calc_temp = "N/A";
	calc_temp = parseFloat((temp + 0.33*(hum/100.0)*6.105*Math.exp(17.27*temp/(237.7+temp))- 0.70*wspeed - 4.00)).toFixed(2);
	return calc_temp;
}

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

function loadNewBackGround() {
  const totalImages = 20;
  const randomNum = Math.floor(Math.random() * 21);  // 0…20 inclusiv
  const element = document.querySelector('.home-product');
  if(element) {
    element.style.backgroundImage = `url("https://mellbo.github.io/upx-repo/SMARTHOME-REPO/web-repo/assets/img/background/${randomNum}.jpg")`;
  }  
}

/*------------------------------------------------------------------------------------------------*/
function restoreESP(){
	let data = {
		"RESET": 1
	};
	
	let _js = JSON.stringify(data);	
    if (websck_is_connected) websocket.send(_js);
	_js	= null;
	data = null;
	alert("The system is resetting and restarting, approximately 1 minute.\n" +
      "After restoration, you may need to enter SAFEMODE\n" +
      "to input the configuration data for Internet WIFI.\n" +
      "My address for AP is: http://192.168.1.1\n\n" +
      "Confirm this dialog after you are already connected to 'UPX-SMARTHOME'!");

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
    if (websck_is_connected) websocket.send(_js);
	_js	= null;
	data = null;
	alert("The system is restarting, 30 seconds.\n" +
      "Refresh the page after the time has elapsed.");

	setTimeout(function(){
		location.reload();
		}, 3000);		  
}
/*------------------------------------------------------------------------------------------------*/
function PowerOff(){
	if (confirm("Do you really want to shut down the system?")) {
		let data = {"SHUTDOWN": 1};
		let _js = JSON.stringify(data);	
		if (websck_is_connected) websocket.send(_js);
		_js	= null;
		data = null;
		alert("Power OFF.\nHave nice Day.");
    window.location.replace("https://upx.ro");
	}
}
/*------------------------------------------------------------------------------------------------*/
function rebootInSafeMode(){
  ERROR_INSTANCE = 1;
	let data = {
		"SAFEMODE": 1
	};
	
	let _js = JSON.stringify(data);	
    if (websck_is_connected) websocket.send(_js);
	_js	= null;
	data = null;
	alert("The system is restarting and will run in AP-SAFEMODE.\n" +
      "Look for the WIFI SSID 'UPX-VPS-GATEWAY' and connect to it.\n" +
      "My address for AP is: http://192.168.1.1\n\n" +
      "Confirm this dialog after you are already connected to 'UPX-SMARTHOME'!");

	setTimeout(function(){
		window.location.replace("http://192.168.1.1");
		}, 3000);		  
}
/*------------------------------------------------------------------------------------------------*/
