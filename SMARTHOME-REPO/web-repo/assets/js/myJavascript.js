/*SECTION UPDATE livePARAM*/
var AddNewTemperatureInMonth = '';
var resetThermostat = '0';
var PREFERED_LIGHT_DORMITOR = '0';
var LAST_OUTDOOR_LDR = 0;
var idleTime = 0;
var THERMOSTATLAST = '';

/*ESP WebSocket*/
var gateway = window.location.port 
  ? `ws://${window.location.hostname}:${window.location.port}/ws` 
  : `ws://${window.location.hostname}/ws`;  
  var websocket;
  var websck_is_connected = false;
  var millis_esp = 0;
  
$(document).ready(function() {
    initWebSocket(); //ESP WebSocket  
    var page = window.location.pathname;
        page = page.split("/").pop();
		if (page == '') page = 'index.html';
      if (page == 'settings.html') {
        checkLogin('false');
      }

    checkIfMobile();
    
	/*TIMER1*/
	if ((page == 'index.html') || (page == 'dashboard.html')) {
		setInterval(function(){				
					$.ajax({
					url: "../php/liveParamToJson.php",
					data: "",
					success: function(data) {
                        /*PRELUARE DATE*/
						updateHomeData(data);
					}
				});
		}, 5000);
	}	
	/*END TIMER1*/
    /*TIMER2*/
    var idleInterval = setInterval(timerIncrement, 60000);
    $(this).mousemove(function (e) {
        idleTime = 0;
    });
    $(this).keypress(function (e) {
        idleTime = 0;
    });    
    /*END TIMER2*/
	
    if (page == 'settings.html') {
	//Load Calendar Data
	loadCalendar(); 
	loadSetings();
	}
	
	if (page == 'logs.html') {
		getLogs('readInfo');
		getLogs('readWarning');
		getLogs('readError');
		getLogs('readKeys'); 
	}
}); //end onLoad		

/*ESP WebSocket*/
/*------------------------------------------------------------------------------------*/
  function onOpen(event) {
    websck_is_connected = 1;
    pool_info_page();
		verificaVersiune();
    setTimeout(function(){
      checkMillis(); // check if is OK page
    },2000);    
    console.log('Connection opened');
  }
/*-----------------------------------------------------------------------------------*/
  function onClose(event) {
    websck_is_connected = 0;
    console.log('Connection closed');
    setTimeout(initWebSocket, 2000);
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
		//document.getElementById("cMillis").innerText = jsonObject['cMs'];
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
function pool_info_page() {
  	let data = {
		"INDEX_PAGE": 1
	};
	
	let _js = JSON.stringify(data);	
  if (websck_is_connected) websocket.send(_js);
	_js	= null;
	data = null;

	setTimeout(function(){
		pool_info_page();
		}, 1000);		
}
/*-----------------------------------------------------------------------------------*/
function checkMillis() {
  let currentMillis = millis_esp;
  if (typeof checkMillis.lastMillis === 'undefined') {
    checkMillis.lastMillis = 0;
  }
  if (currentMillis === checkMillis.lastMillis) {
	location.reload(true);
  } else {
    checkMillis.lastMillis = currentMillis;
  }
  setTimeout(checkMillis, 1500);
}
/*-----------------------------------------------------------------------------------*/

  
/*SECTION SLIDERS*/
//set_NewTEMPInCALL
$('#set_NewTEMPInCALL').slider({
	id: 'ex1Slider', //class
	min: 5.0,
	max: 50.0,
	step: 0.1,
	value: 22.0,
	tooltip: 'yes',
	tooltip_position:'top',
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
	tooltip_position:'top',
    handle: 'round',
	focus: false,
});
$("#set_CENTRALA_ON_HISTERIZIS").on("change", function(slideEvt) {
    $("#param1Value").text($(this).val());	
});

//set_TEMP_INDOOR_CALCULATION_METHOD
$("#set_TEMP_INDOOR_CALCULATION_METHOD").slider({
	id: 'ex1Slider', //class
	min: 0,
	max: 5,
	step: 1,
	value: 1,
	tooltip: 'yes',
	tooltip_position:'top',
    handle: 'round',
	focus: false,
});
$("#set_TEMP_INDOOR_CALCULATION_METHOD").on("change", function(slideEvt) {
    $("#param2Value").text($(this).val());
    $('#metodaCalculBtn').addClass('in');
});

//set_jalAutoModeRun
$("#set_jalAutoModeRun").slider({
	id: 'ex1Slider', //class
	min: 0,
	max: 900,
	step: 1,
	value: 0,
	tooltip: 'yes',
	tooltip_position:'top',
    handle: 'round',
    //scale: 'logarithmic',
	focus: false,
});

$("#set_jalAutoModeRun").on("change", function(slideEvt) {
    $("#param3Value").text($(this).val());	
});

//preset
$("#MROFF").on("click",function(e){
    setSlideValue("#set_jalAutoModeRun","#param3Value",0);
});
$("#MRUP").on("click",function(e){
    setSlideValue("#set_jalAutoModeRun","#param3Value",1);
});
$("#MRDOWN").on("click",function(e){
    setSlideValue("#set_jalAutoModeRun","#param3Value",2);
});
$("#MRAUTOMAT").on("click",function(e){
    setSlideValue("#set_jalAutoModeRun","#param3Value",3);
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
	tooltip_position:'top',
    handle: 'round',
	focus: false,
});
$("#set_LowLightPoint").on("change", function(slideEvt) {
    $("#param4Value").text($(this).val());	
});

//set_jaluzHisterizis
$("#set_jaluzHisterizis").slider({
	id: 'ex1Slider', //class
	min: 0,
	max: 200,
	step: 1,
	value: 20,
	tooltip: 'yes',
	tooltip_position:'top',
    handle: 'round',
	focus: false,
});
$("#set_jaluzHisterizis").on("change", function(slideEvt) {
    $("#param5Value").text($(this).val());	
});

//set_FunTemperatureTrigger
$("#set_FunTemperatureTrigger").slider({
	id: 'ex1Slider', //class
	min: 20.0,
	max: 50.0,
	step: 0.25,
	value: 24.0,
	tooltip: 'yes',
	tooltip_position:'top',
    handle: 'round',
	focus: false,
});
$("#set_FunTemperatureTrigger").on("change", function(slideEvt) {
    $("#param6Value").text($(this).val());	
});

/*SLIDERS END*/

/*dtPicker*/
$('.clockpicker').clockpicker({
    placement: 'right',
    align: 'right',
    autoclose: true,
    default : 'now',
    fromnow:0,
});


$(".addThermostat").on("change", function(e) {
    var grade = $("#gradeCelsius").val();
    var ora = $("#dtPicker").val();
    var data = '';
    if (((ora != "") && (ora !== null)) &&
        ((grade != "") && (grade !== null))) {
        data = ora+":00\t"+grade;
        $("#dtOut").text(data);
    } else {
       $("#dtOut").text('');	 
    }
        
});


//BuTTON
$('#setLivoloTestID').keyup(function(event){
    if (event.keyCode === 13) {
        $("#save").click();
    }    
});

$('#gradeCelsius').keyup(function(event){
    if (event.keyCode === 13) {
        $('#set_NewTEMPInCALL').slider('setValue', $(this).val(), true);     
        $("#adaugaInThermostat").click();       
    }    
});

$("#edPswd").keyup(function(event) {
    if (event.keyCode === 13) {
        $("#checkBtnID").click();
    }
});

$('#LockID').on('click', function(){
    checkLogin('true');
});

$('#checkBtnID').on('click', function(){
    checkLogin('false');
    //location.reload(true);
});

$('#preff_ldr').on('click',function(){
   PREFERED_LIGHT_DORMITOR = LAST_OUTDOOR_LDR; 
   saveSettings(); 
});

$('#btnKeyInfo').on('click',function(){
   getLogs('readKeys'); 
});

$('#btnLogInfo').on('click',function(){
   getLogs('readInfo'); 
});

$('#btnLogWarning').on('click',function(){
   getLogs('readWarning'); 
});

$('#btnLogError').on('click',function(){
   getLogs('readError'); 
});

$('#reload_callendar').on('click', function (e) { 
loadCalendar();
})

$('#del_itm_calendar').on('click', function (e) { 
deleteItmCalendar($('#selCalendarItem option:selected').val());
})

$("#adaugaInThermostat").on('click',function(e){
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

$('#save2').on('click',function(){
   saveSettings(); 
});

$('#save').on('click',function(){
   saveSettings(); 
});

$('#reset_cal_month').on('click',function(){
  resetThermostat = "1";  
  saveSettings();
  resetThermostat = "0";
});
$('#reset_cal_all').on('click',function(){
  resetThermostat = "2";  
  saveSettings();
  resetThermostat = "0";
});
//resetThermostat

/*FUNCTION*/

function setSlideValue(id,idShow,value){
    if (id != null) {$(id).slider('setValue', value, true);}
    if (idShow != null) {$(idShow).text($(id).val());}    
}

function loadCalendar() {
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

function updateHomeData(dataFromPhp) {
				//-->OUT TEXT JSON
				var jsonData = JSON.parse(dataFromPhp);
				//-->UPDATE ITEMS BY ID & INI 'NAME' ITEM
				var DaSauNu = "";
                var blinkClass = "";
				var cal1St,cal1Req,cal1Vcc;
				var cal2St,cal2Req,cal2Vcc;
				var cal3St,cal3Req,cal3Vcc;
				var cal4St,cal4Req,cal4Vcc;
				var cal5St,cal5Req,cal5Vcc;
				var cal6St,cal6Req,cal6Vcc;
				 
				 cal1Req = jsonData.LIVE["CALOR1_SET_STATE"];
				 cal2Req = jsonData.LIVE["CALOR2_SET_STATE"];
				 cal3Req = jsonData.LIVE["CALOR3_SET_STATE"];
				 cal4Req = jsonData.LIVE["CALOR4_SET_STATE"];
				 cal5Req = jsonData.LIVE["CALOR5_SET_STATE"];
				 cal6Req = jsonData.LIVE["CALOR6_SET_STATE"];
				 
				 cal1St = jsonData.LIVE["CALOR1_CUR_STATE"];
				 cal2St = jsonData.LIVE["CALOR2_CUR_STATE"];
				 cal3St = jsonData.LIVE["CALOR3_CUR_STATE"];
				 cal4St = jsonData.LIVE["CALOR4_CUR_STATE"];
				 cal5St = jsonData.LIVE["CALOR5_CUR_STATE"];
				 cal6St = jsonData.LIVE["CALOR6_CUR_STATE"];
				 
				 blinkClass = checkValueForBlink(jsonData.LIVE["CALOR1_VCC"],2100,3300);
				 $("#CALOR1_VCC").html('<div class="'+blinkClass+'">'+jsonData.LIVE["CALOR1_VCC"]+'mV</div>');
				 blinkClass = checkValueForBlink(jsonData.LIVE["CALOR2_VCC"],2100,3300);
				 $("#CALOR2_VCC").html('<div class="'+blinkClass+'">'+jsonData.LIVE["CALOR2_VCC"]+'mV</div>');
				 blinkClass = checkValueForBlink(jsonData.LIVE["CALOR3_VCC"],2100,3300);
				 $("#CALOR3_VCC").html('<div class="'+blinkClass+'">'+jsonData.LIVE["CALOR3_VCC"]+'mV</div>');				 
				 blinkClass = checkValueForBlink(jsonData.LIVE["CALOR4_VCC"],2100,3300);
				 $("#CALOR4_VCC").html('<div class="'+blinkClass+'">'+jsonData.LIVE["CALOR4_VCC"]+'mV</div>');				 
				 blinkClass = checkValueForBlink(jsonData.LIVE["CALOR5_VCC"],2100,3300);
				 $("#CALOR5_VCC").html('<div class="'+blinkClass+'">'+jsonData.LIVE["CALOR5_VCC"]+'mV</div>');
				 blinkClass = checkValueForBlink(jsonData.LIVE["CALOR6_VCC"],2100,3300);
				 $("#CALOR6_VCC").html('<div class="'+blinkClass+'">'+jsonData.LIVE["CALOR6_VCC"]+'mV</div>');
				 				 
				 $("#THERMOSTAT").html(jsonData.LIVE["THERMOSTAT"]);
				 $("#TEMP_BUCATARIE").html(jsonData.LIVE["TEMP_BUCATARIE"]);
				 $("#TEMP_DORMITOR").html('<div>'+jsonData.LIVE["TEMP_DORMITOR"]+'&nbsp;&nbsp;'+processCalorPos("cal6",cal5St,cal5Req)+'</div>');
				 
				 //$("#TEMP_DORMITOR2").html(jsonData.LIVE["TEMP_DORMITOR2"]);
                 blinkClass = checkValueForBlink(jsonData.LIVE["HUM_DORMITOR2"],20,65);
				 $("#TEMP_DORMITOR2").html('<div class="'+blinkClass+'">'+jsonData.LIVE["TEMP_DORMITOR2"]+
										   '&nbsp;&nbsp;<i class="icon ion-waterdrop"></i>'+jsonData.LIVE["HUM_DORMITOR2"] +
										   '%&nbsp;&nbsp;'+processCalorPos("cal5",cal6St,cal6Req)+'</div>');				 
				 
                 blinkClass = checkValueForBlink(jsonData.LIVE["HOL_HUMIDITY"],20,65);
				 $("#TEMP_HOL").html('<div class="'+blinkClass+'">'+jsonData.LIVE["TEMP_HOL"]+
									 '&nbsp;&nbsp;<i class="icon ion-waterdrop"></i>'+jsonData.LIVE["HOL_HUMIDITY"] +
									 '%&nbsp;&nbsp;'+processCalorPos("cal1",cal1St,cal1Req)+processCalorPos("cal2",cal2St,cal2Req)+
									 processCalorPos("cal3",cal3St,cal3Req)+
									 processCalorPos("cal4",cal4St,cal4Req)+'</div>');
									 
				 $("#TEMP_EXTERN").html(jsonData.LIVE["TEMP_EXTERN"]+'&nbsp;&nbsp;<i class="icon ion-waterdrop"></i>'+jsonData.LIVE["HUMIDITY_EXT"] + '%');
				 blinkClass = checkValueForBlink(jsonData.LIVE["VOLTAGE_BATTERY"],12.0,13.9);
				 $("#VOLTAGE_BATTERY").html('<div class="'+blinkClass+'">'+jsonData.LIVE["VOLTAGE_BATTERY"]+'</div>');
				 blinkClass = checkValueForBlink(jsonData.LIVE["VOLTAGE_RAIL12"],11.8,12.5);
				 $("#VOLTAGE_RAIL12").html('<div class="'+blinkClass+'">'+jsonData.LIVE["VOLTAGE_RAIL12"]+'</div>');				 				 				 
				 blinkClass = checkValueForBlink(jsonData.LIVE["VOLTAGE_MAIN"],14.9,15.6);
				 $("#VOLTAGE_MAIN").html('<div class="'+blinkClass+'">'+jsonData.LIVE["VOLTAGE_MAIN"]+'</div>');
				 
				if (jsonData.LIVE["CentralaOn"] == "True") {DaSauNu = "DA";} else {DaSauNu = "NU";}
				 $("#CentralaOn").html(DaSauNu + ' de ' + jsonData.LIVE["IncalzireSecondsLastState"]);
				if (jsonData.LIVE["ClimaOn"] == "True") {DaSauNu = "DA";} else {DaSauNu = "NU";}
				 $("#ClimaON").html(DaSauNu);				 
				 $("#jalAutoModeRun").html(decodeJalAutoMode(jsonData.LIVE["jalAutoModeRun"]));
				 $("#LowLightPoint").html(jsonData.LIVE["LowLightPoint"]);
				if (jsonData.LIVE["AlowLightOFF"] == "True") {DaSauNu = "DA";} else {DaSauNu = "NU";}
				 $("#AlowLightOFF").html(DaSauNu);
				if (jsonData.LIVE["HomeIsAlone"] == "True") {DaSauNu = "DA";} else {DaSauNu = "NU";}
				 $("#HomeIsAlone").html(DaSauNu);
				 $("#jaluzHisterizis").html(jsonData.LIVE["jaluzHisterizis"]);
    
				 blinkClass = checkValueForBlink(jsonData.LIVE["KEY110BATTERY"],2.75,3.30);
				 $("#KEY110BATTERY").html('<div class="'+blinkClass+'">'+jsonData.LIVE["KEY110BATTERY"]+'</div>');				 				 
				 $("#KEY110CONTOR").html(jsonData.LIVE["KEY110CONTOR"]);
				 $("#KEY110LASTSEEN").html(jsonData.LIVE["KEY110LASTSEEN"]);
				if (jsonData.LIVE["KEY110ENABLE"] == "True") {DaSauNu = "DA";} else {DaSauNu = "NU";}
				 $("#KEY110ENABLE").html(DaSauNu);
				if (jsonData.LIVE["KEY110HOME"] == "True") {DaSauNu = "DA";} else {DaSauNu = "NU";}
				 $("#KEY110HOME").html(DaSauNu +', de '+jsonData.LIVE['KEY110LASTCHANGE']);
				 $("#KEY110NAME").html(jsonData.LIVE["KEY110NAME"]);

				 blinkClass = checkValueForBlink(jsonData.LIVE["KEY120BATTERY"],2.75,3.30);
				 $("#KEY120BATTERY").html('<div class="'+blinkClass+'">'+jsonData.LIVE["KEY120BATTERY"]+'</div>');					 
				 $("#KEY120CONTOR").html(jsonData.LIVE["KEY120CONTOR"]);
				 $("#KEY120LASTSEEN").html(jsonData.LIVE["KEY120LASTSEEN"]);
				if (jsonData.LIVE["KEY120ENABLE"] == "True") {DaSauNu = "DA";} else {DaSauNu = "NU";}
				 $("#KEY120ENABLE").html(DaSauNu);
				if (jsonData.LIVE["KEY120HOME"] == "True") {DaSauNu = "DA";} else {DaSauNu = "NU";}
				 $("#KEY120HOME").html(DaSauNu +', de '+jsonData.LIVE['KEY120LASTCHANGE']);
				 $("#KEY120NAME").html(jsonData.LIVE["KEY120NAME"]);

				 blinkClass = checkValueForBlink(jsonData.LIVE["KEY130BATTERY"],2.75,3.30);
				 $("#KEY130BATTERY").html('<div class="'+blinkClass+'">'+jsonData.LIVE["KEY130BATTERY"]+'</div>'); 
				 $("#KEY130CONTOR").html(jsonData.LIVE["KEY130CONTOR"]);
				 $("#KEY130LASTSEEN").html(jsonData.LIVE["KEY130LASTSEEN"]);
				if (jsonData.LIVE["KEY130ENABLE"] == "True") {DaSauNu = "DA";} else {DaSauNu = "NU";}
				 $("#KEY130ENABLE").html(DaSauNu);
				if (jsonData.LIVE["KEY130HOME"] == "True") {DaSauNu = "DA";} else {DaSauNu = "NU";}
				 $("#KEY130HOME").html(DaSauNu +', de '+jsonData.LIVE['KEY130LASTCHANGE']);
				 $("#KEY130NAME").html(jsonData.LIVE["KEY130NAME"]);

				 blinkClass = checkValueForBlink(jsonData.LIVE["KEY255BATTERY"],2.75,3.30);
				 $("#KEY255BATTERY").html('<div class="'+blinkClass+'">'+jsonData.LIVE["KEY255BATTERY"]+'</div>'); 				 
				 $("#KEY255CONTOR").html(jsonData.LIVE["KEY255CONTOR"]);
				 $("#KEY255LASTSEEN").html(jsonData.LIVE["KEY255LASTSEEN"]);
				if (jsonData.LIVE["KEY255ENABLE"] == "True") {DaSauNu = "DA";} else {DaSauNu = "NU";}
				 $("#KEY255ENABLE").html(DaSauNu);
				if (jsonData.LIVE["KEY255HOME"] == "True") {DaSauNu = "DA";} else {DaSauNu = "NU";}
				 $("#KEY255HOME").html(DaSauNu +', de '+jsonData.LIVE['KEY255LASTCHANGE']);
				 $("#KEY255NAME").html(jsonData.LIVE["KEY255NAME"]);
    
				 $("#TEMP_INDOOR_CALCULATION_METHOD").html(jsonData.LIVE["TEMP_INDOOR_CALCULATION_METHOD"]);
				 $("#CENTRALA_ON_HISTERIZIS").html(jsonData.LIVE["CENTRALA_ON_HISTERIZIS"]);
				if (jsonData.LIVE["THERMOSTAT_OUTSIDE_ENABLE"] == "True") {DaSauNu = "DA";} else {DaSauNu = "NU";}
				 $("#THERMOSTAT_OUTSIDE_ENABLE").html(DaSauNu);
				 $("#ThisUpdateTime").html(jsonData.LIVE["ThisUpdateTime"]);
				 $("#TEMP_GATEWAY").html(jsonData.LIVE["TEMP_GATEWAY"]);
				 $("#TEMP_MATRIX").html((temp_resimtita(parseFloat(jsonData.LIVE["MATRIX_INDOOR"]), parseFloat(jsonData.LIVE["HOL_HUMIDITY"]), 0.2))).toString();
				 $("#jalModeNow").html(decodeJalModeNow(jsonData.LIVE["jalModeNow"]));
				 $("#outdoorLDR").html(jsonData.LIVE["outdoorLDR"]);
				 $("#dormitorLDR").html(jsonData.LIVE["dormitorLDR"]);
                   LAST_OUTDOOR_LDR = jsonData.LIVE["dormitorLDR"];
				 $("#MATRIX_INDOOR").html(jsonData.LIVE["MATRIX_INDOOR"]);
				 $("#jalAutoModeRunDSP").html(jsonData.LIVE["jalAutoModeRun"]);    
                 $("#updateTime").text(jsonData.LIVE["ThisUpdateTime"]);
}


function loadSetings() {
	/*PRELUARE DATE*/
	$.ajax({
		url: "../php/settings_param.php",
        type:'post',
		data: {'act':'read'},
		success: function(data) {
            parseSettings(data);       
		}
	});
}

function parseSettings(raw){
/*
    $('#set_THERMOSTAT_OUTSIDE_ENABLE').attr('checked',true);
    //alert($('#set_THERMOSTAT_OUTSIDE_ENABLE:checked').val() ? 1:);
    alert(
       $('#set_THERMOSTAT_OUTSIDE_ENABLE').attr('checked')?"True":"False" 
    );
*/	
	var jsonData = JSON.parse(raw);
	if (jsonData == null) {return;}
    
  $("#set_THERMOSTAT_OUTSIDE_ENABLE").attr('checked',(jsonData.SYSTEM["THERMOSTAT_OUTSIDE_ENABLE"].toLowerCase() === 'true'));
	$("#set_forceMainDoorOpen").attr('checked',(jsonData.SYSTEM["forceMainDoorOpen"].toLowerCase() === 'true'));
	$("#set_AlowLightOFF").attr('checked',(jsonData.SYSTEM["AlowLightOFF"].toLowerCase() === 'true'));
	
	$("#setKEY110_ENABLE").attr('checked',(jsonData.SYSTEM["KEY110_ENABLE"].toLowerCase() === 'true'));
	$("#setKEY120_ENABLE").attr('checked',(jsonData.SYSTEM["KEY120_ENABLE"].toLowerCase() === 'true'));
	$("#setKEY130_ENABLE").attr('checked',(jsonData.SYSTEM["KEY130_ENABLE"].toLowerCase() === 'true'));
	$("#setKEY255_ENABLE").attr('checked',(jsonData.SYSTEM["KEY255_ENABLE"].toLowerCase() === 'true'));
	
	$("#SetKEY110NAME").val(jsonData.SYSTEM["SetKEY110NAME"]);
	$("#SetKEY120NAME").val(jsonData.SYSTEM["SetKEY120NAME"]);
	$("#SetKEY130NAME").val(jsonData.SYSTEM["SetKEY130NAME"]);
	$("#SetKEY255NAME").val(jsonData.SYSTEM["SetKEY255NAME"]);
	
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
  $("#smartWelcomeEnable").attr('checked',(jsonData.SYSTEM["smartWelcomeEnable"].toLowerCase() === 'true'));
  $("#smartWelcomeAutoSetup").attr('checked',(jsonData.SYSTEM["smartWelcomeAutoSetup"].toLowerCase() === 'true'));
  $("#welcome_Luni").val(jsonData.SYSTEM["welcome_Luni"]);
  $("#welcome_Marti").val(jsonData.SYSTEM["welcome_Marti"]);
  $("#welcome_Miercuri").val(jsonData.SYSTEM["welcome_Miercuri"]);
  $("#welcome_Joi").val(jsonData.SYSTEM["welcome_Joi"]);
  $("#welcome_Vineri").val(jsonData.SYSTEM["welcome_Vineri"]);
  $("#welcome_Sambata").val(jsonData.SYSTEM["welcome_Sambata"]);
  $("#welcome_Duminica").val(jsonData.SYSTEM["welcome_Duminica"]);

  if ($("#smartWelcomeAutoSetup").is(':checked')) {
   event.preventDefault();
   $('.smartWelcome').prop("disabled", true);
  } else {
    $('.smartWelcome').prop("disabled", false);
  } 
}

function saveSettings() {

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

function getLogs(type) {
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
        case '0':
            return 'MANUAL';
        break;
            
        case '1':
            return 'AUTO';
        break;
            
        case '2':
            return 'USER LDR';
        break;
            
        default:
            return mode;
        break;
            
    }
}

function decodeJalAutoMode(mod) {
    switch(mod){
        case '0':
            return 'STOP';
            break;
        case '1':
            return 'OPEN MAX';
            break;
        case '2':
            return 'CLOSE MAX';
            break;
        case '3':
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
        window.location.reload();
    }
    if (idleTime > 10) {
        $("body").css({'overflow': 'hidden'});
    } else {
        $("body").css({'overflow': 'auto'});
    }
}

function checkLogin(lock){
    var MD5 = Math.round(
            new Date().getTime() + 
            (Math.random() * 100)
    );
    
    var mod = '';
    if (lock == 'false') {
      mod = $('#edPswd').val();
    } else {
		document.cookie = 'home_login' + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        mod = '*';
    }
    
	$.ajax({
		url: "../php/login.php",
        type:'post',
		async:false,
		dataType: 'json',
		cache: false,
		timeout: 10000,		
		data: {'act':MD5,'passwd':mod},
		success: function(data) {
            if (data[0] == (MD5*42)){
                $('#loginID').addClass('hidden');
                $('#settingsContainerID').removeClass('hidden');
            } else {
                $('#loginID').removeClass('hidden');
                $('#settingsContainerID').addClass('hidden'); 
                $('#loginErrorID').html(data[0]);
                $('#edPswd').val('');
            }
			if (data[1] == 1) location.reload(true);
		},
		error: function(e){
			console.log(e);
		}		
	});    
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
            $('#loginID').removeClass('home-product');
            $('#LogsContainerID').removeClass('home-product');
            $('#sumarID').addClass('hidden');
            return true;
        } else {
            return false;
        }
}

$("#smartWelcomeAutoSetup").on("change",function(e){
  if ($("#smartWelcomeAutoSetup").is(':checked')) {
   event.preventDefault();
   $('.smartWelcome').prop("disabled", true);
  } else {
    $('.smartWelcome').prop("disabled", false);
  }
});

function temp_resimtita(temp,hum,wspeed) {
	var calc_temp = "N/A";
	calc_temp = parseFloat((temp + 0.33*(hum/100.0)*6.105*Math.exp(17.27*temp/(237.7+temp))- 0.70*wspeed - 4.00)).toFixed(2);
	return calc_temp;
}