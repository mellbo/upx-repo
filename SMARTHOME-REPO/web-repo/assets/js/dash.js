$(document).ready(function() {
               
	        /*TIMER1*/
			  start();
        loadWeather();
				setInterval(function()
				{				
				$.ajax({
					url: "../php/liveParamToJson.php",
					data: "",
					success: function(data) {
                        /*PRELUARE DATE*/
						updateHomeData(data);
					}
				});
        loadWeather();
				}, 5000);
            /*END TIMER1*/
});


function start(){
				$.ajax({
					url: "../php/liveParamToJson.php",
					data: "",
					success: function(data) {
                        /*PRELUARE DATE*/
						updateHomeData(data);
					}
				});		
}

function loadWeather(){
    const hours = new Date();
	  
    var jsonWeather;
    $.get("../php/injectJson.php", function(response) {
      jsonWeather = JSON.parse(response);
       /*Weather page*/
    const sunrise = new Date(jsonWeather.Day0['sunrise']);
    const sunset = new Date(jsonWeather.Day0['sunset']);
    const isDayTime = ((hours > sunrise) && (hours < sunset));
      
      if (isDayTime == true) {
        $("#weatherTodayDate").html('<i class="fas fa-sun" id="weatherTodayDateIcon" style="font-size: 17px; margin: 11px;"></i>'+jsonWeather.Day0['dayName']);
        $("#weatherTodayDayNarative").html(jsonWeather.Day0['day']);              
        $("#weatherTodayIcon").attr('src','../weather/logo/weather_logo.php?idx='+jsonWeather.Day0['iconDay']+'&idxlbl='+jsonWeather.Day0['phraseDay']); 
      } else {
        $("#weatherTodayDate").html('<i class="fas fa-moon" id="weatherTodayDateIcon" style="font-size: 17px; margin: 11px;"></i>'+jsonWeather.Day0['nightName']);
        $("#weatherTodayDayNarative").html(jsonWeather.Day0['night']);  
        $("#weatherTodayIcon").attr('src','../weather/logo/weather_logo.php?idx='+jsonWeather.Day0['iconNight']+'&idxlbl='+jsonWeather.Day0['phraseNight']+'&forceNight=true'); 
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
      
      
      $("#icon1Std").attr('src','../weather/logo/weather_logo.php?idx='+jsonWeather.Day1['iconDay']+'&forceDay=true'+'&idxlbl='+jsonWeather.Day1['phraseDay']); 
      $("#icon2Std").attr('src','../weather/logo/weather_logo.php?idx='+jsonWeather.Day2['iconDay']+'&forceDay=true'+'&idxlbl='+jsonWeather.Day2['phraseDay']); 
      $("#icon3Std").attr('src','../weather/logo/weather_logo.php?idx='+jsonWeather.Day3['iconDay']+'&forceDay=true'+'&idxlbl='+jsonWeather.Day3['phraseDay']); 
      $("#icon4Std").attr('src','../weather/logo/weather_logo.php?idx='+jsonWeather.Day4['iconDay']+'&forceDay=true'+'&idxlbl='+jsonWeather.Day4['phraseDay']); 
      
    });   
}

function updateHomeData(dataFromPhp) {
				//-->OUT TEXT JSON
				var DaSauNu = "";
				var jsonData = JSON.parse(dataFromPhp);
				var blinkClass = "";
				
				/*page1*/
				 $("#lbl_dormitor_temp").html(jsonData.LIVE["TEMP_DORMITOR"]+'<label>ºC</label>');				 
				 $("#lbl_dormitor2_temp").html(jsonData.LIVE["TEMP_DORMITOR2"]+'<label>ºC</label>');
				 $("#lbl_living_temp").html(jsonData.LIVE["TEMP_HOL"]+'<label>ºC</label>');
				 $("#lbl_ext_temp").html(jsonData.LIVE["TEMP_EXTERN"]+'<label>ºC</label>');
				 //$("#lbl_matrix_temp").html(jsonData.LIVE["MATRIX_INDOOR"]+'<label>ºC</label>');
				 $("#lbl_matrix_temp").html(temp_resimtita(parseFloat(jsonData.LIVE["MATRIX_INDOOR"]), parseFloat(jsonData.LIVE["HOL_HUMIDITY"]), 0.2)+'<label>ºC</label>');
				 $("#lbl_thermostatset_temp").html(jsonData.LIVE["THERMOSTAT"]+'<label>ºC</label>');				 
				 //indicator heating
				 if (jsonData.LIVE["CentralaOn"] == "False") {
					$("#heaton_icon").addClass("invisible");
				 } else {
               $("#heaton_icon").removeClass("invisible");  
              }
				 
				 /*page2*/
				 $("#lbl_umid_exterior").html(jsonData.LIVE["HUMIDITY_EXT"]+'<label>%</label>');
				 $("#lbl_umid_interior").html(jsonData.LIVE["HOL_HUMIDITY"]+'<label>%</label>');
				 $("#lbl_jal_raw").html(jsonData.LIVE["jalAutoModeRun"]+'<label>lx</label>');
				 $("#lbl_jalmode").html(decodeJalModeNow(jsonData.LIVE["jalModeNow"]));
				 $("#lbl_ldr_exterior").html(jsonData.LIVE["outdoorLDR"]+'<label>LX</label>');
				 $("#lbl_ldr_interior").html(jsonData.LIVE["dormitorLDR"]+'<label>LX</label>');
				 
				 /*page3*/
				 $("#lbl_battery").html(jsonData.LIVE["VOLTAGE_BATTERY"]+'<label>V</label>');
				 $("#lbl_12V").html(jsonData.LIVE["VOLTAGE_RAIL12"]+'<label>V</label>');
				 $("#lbl_mainsupply").html(jsonData.LIVE["VOLTAGE_MAIN"]+'<label>V</label>');
				 $("#totalHeatTime").html(jsonData.LIVE["totalHeatTime"]);
				 $("#lastHeatTime").html(jsonData.LIVE["IncalzireSecondsLastState"]);
				 $("#heatingState").html(jsonData.LIVE["CentralaOn"]);
				 
				 /*page Calor*/
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
				 
				 
				 $("#CALOR1_CUR_STATE").html(decodeCalorMode(jsonData.LIVE["CALOR1_CUR_STATE"]));
				 $("#CALOR2_CUR_STATE").html(decodeCalorMode(jsonData.LIVE["CALOR2_CUR_STATE"]));
				 $("#CALOR3_CUR_STATE").html(decodeCalorMode(jsonData.LIVE["CALOR3_CUR_STATE"]));
				 $("#CALOR4_CUR_STATE").html(decodeCalorMode(jsonData.LIVE["CALOR4_CUR_STATE"]));
				 $("#CALOR5_CUR_STATE").html(decodeCalorMode(jsonData.LIVE["CALOR5_CUR_STATE"]));
				 $("#CALOR6_CUR_STATE").html(decodeCalorMode(jsonData.LIVE["CALOR6_CUR_STATE"]));
				 
				 $("#CALOR1_SET_STATE").html(decodeCalorMode(jsonData.LIVE["CALOR1_SET_STATE"]));
				 $("#CALOR2_SET_STATE").html(decodeCalorMode(jsonData.LIVE["CALOR2_SET_STATE"]));
				 $("#CALOR3_SET_STATE").html(decodeCalorMode(jsonData.LIVE["CALOR3_SET_STATE"]));
				 $("#CALOR4_SET_STATE").html(decodeCalorMode(jsonData.LIVE["CALOR4_SET_STATE"]));
				 $("#CALOR5_SET_STATE").html(decodeCalorMode(jsonData.LIVE["CALOR5_SET_STATE"]));
				 $("#CALOR6_SET_STATE").html(decodeCalorMode(jsonData.LIVE["CALOR6_SET_STATE"]));
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

function decodeCalorMode(mode){
	switch(mode){
		case '0':
			return '<div>NEDEFINIT</div>';
		break;
		
		case '1':
			return '<div class="green">DESCHIS</div>';
		break;
		
		case '2':
			return '<div class = "red">INCHIS</div>';
		break;
	}
}

$("#btn_turbo").on("click",function(e){
   UpdateSettings(); 
});




function saveSettings(preLoad) {
	var jsonData = JSON.parse(preLoad);
	if (jsonData == null) {return;} 
  jsonData.SYSTEM["THERMOSTATFORCE24"] = "1";
  
  var jsonFormed = '{"act":"write","SYSTEM":'+JSON.stringify(jsonData.SYSTEM)+'}';
	var sendData = JSON.parse(jsonFormed);
 
	$.ajax({
		url: "../php/settings_param.php",
        type:'post',
		data: sendData,
		success: function(data) {
            $('#replySave').html(data);  //response   
		}
	});	    
}


function UpdateSettings() {
	/*PRELUARE DATE*/
	$.ajax({
		url: "../php/settings_param.php",
        type:'post',
		data: {'act':'read'},
		success: function(data) {
            saveSettings(data);       
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

function temp_resimtita(temp,hum,wspeed) {
	var calc_temp = "N/A";
	calc_temp = parseFloat((temp + 0.33*(hum/100.0)*6.105*Math.exp(17.27*temp/(237.7+temp))- 0.70*wspeed - 4.00)).toFixed(2);
	return calc_temp;
}