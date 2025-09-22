/*SECTION UPDATE livePARAM*/
var PAGENAME = '';
var AddNewTemperatureInMonth = '';
var resetThermostat = 0;
var PREFERED_LIGHT_DORMITOR = 0;
var LIVE_DORMITOR_LDR = 0;
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
var RSSI = 0;
var isLOCAL = 0;
var ERROR_INSTANCE = 0;
var paginaVizibila = true;
 
 /*
 This var must be same in Arduino header.h
*/
const LIVE_DATA_TYPE = 1; // index.html - live_data
const GET_DATA_TYPE  = 2; // settings.html - SYSTEM
const GET_DATA_QUICK = 3; // setings.html - qck_set_fdbck
const ONLY_PING = 254;
      //ERROR_INSTANCE = 255 but not use from script->esp 

 
$(document).ready(function() {
    initWebSocket(); //ESP WebSocket  
    PAGENAME = window.location.pathname;
    PAGENAME = PAGENAME.split("/").pop();
		if (PAGENAME == '') PAGENAME = 'index';
    
    if ((!checkIfMobile()) && 
        ((PAGENAME == 'index') || (PAGENAME == 'logs'))
        ) loadNewBackGround();

    if (PAGENAME == 'index') {
      $('#idPlsWait').removeClass('hidden'); //show Loading
      inject_function_index();
    }

    if (PAGENAME == 'settings') {
      $('#idPlsWait').removeClass('hidden'); //show Loading
      inject_function_settings();      
    }
	
    if (PAGENAME == 'logs') {
      $('#idPlsWait').removeClass('hidden'); //show Loading
      inject_function_events();
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
/*-----------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------*/
/*FOR SETTINGS PAGE*/
function inject_function_settings() {
  console.log("loading action and function settings");
  /*COMMON FUCNTION FOR SETTINGS*/
 	/*-----------------------------------------------------------------------------------*/
    window.setSlideValue = function(id, idShow, value){
      if (id != null) { $(id).slider('setValue', value, true); }
      if (idShow != null) { $(idShow).text($(id).val()); }
    };
	/*-----------------------------------------------------------------------------------*/
  /* FUCNTION PARSE QUICK UPDATE IN SETTINGS PAGE */
    window.parseQuickSys = function (jsonData){
      if (jsonData == null) {   
       return;
      }
      console.log(jsonData);
      let en_quick = 0;
      const sys_data = jsonData["QUICKSYSTEM"];
      if (sys_data.hasOwnProperty("en_quick") == 1) en_quick = 1;
      LIVE_DORMITOR_LDR = sys_data["dormitorLDR"];  		 
      $("#dormitorLDR").html(LIVE_DORMITOR_LDR);
      if (en_quick) {
        console.log("Mark en_quick!");
        $('#climatizareOption').val(sys_data["CLIMA_MODE"]);
        $('#set_forceMainDoorOpen').prop('checked', sys_data["forceMainDoorOpen"]);
        $('#force24Thermo').val(sys_data["THERMOSTATFORCE24"]);
      }
    }
	/*-----------------------------------------------------------------------------------*/
		window.parseSettings = function (jsonData){
			if (jsonData == null) {   
		    return;
		  }
		  console.log(jsonData);
		  const sys_data = jsonData["SYSTEM"];
		  $("#set_THERMOSTAT_OUTSIDE_ENABLE").prop('checked',sys_data["THERMOSTAT_OUTSIDE_ENABLE"]);
		  $('#set_forceMainDoorOpen').prop('checked', sys_data["forceMainDoorOpen"]);
		  $("#set_AlowLightOFF").prop('checked',sys_data["AlowLightOFF"]);	
			$("#setKEY110_ENABLE").prop('checked',sys_data["KEY110ENABLE"]);
			$("#setKEY120_ENABLE").prop('checked',sys_data["KEY120ENABLE"]);
			$("#setKEY130_ENABLE").prop('checked',sys_data["KEY130ENABLE"]);
			$("#setKEY255_ENABLE").prop('checked',sys_data["KEY255ENABLE"]);
			
			$("#SetKEY110NAME").val(sys_data["KEY110NAME"]);
			$("#SetKEY120NAME").val(sys_data["KEY120NAME"]);
			$("#SetKEY130NAME").val(sys_data["KEY130NAME"]);
			$("#SetKEY255NAME").val(sys_data["KEY255NAME"]);
			
			$("#setLivoloTestID").val(sys_data["LivoloTestID"]);
      $("#idMaxLogCnt").val(sys_data["MaxLogCnt"]); 
			
			setSlideValue("#set_CENTRALA_ON_HISTERIZIS","#param1Value",sys_data["CENTRALA_ON_HISTERIZIS"]);
			setSlideValue("#set_TEMP_INDOOR_CALCULATION_METHOD","#param2Value",sys_data["TEMP_INDOOR_CALCULATION_METHOD"]);
			setSlideValue("#set_jalAutoModeRun","#param3Value",sys_data["jalAutoModeRun"]);
			setSlideValue("#set_LowLightPoint","#param4Value",sys_data["LowLightPoint"]);
			setSlideValue("#set_jaluzHisterizis","#param5Value",sys_data["jaluzHisterizis"]);
			setSlideValue("#set_FunTemperatureTrigger","#param6Value",sys_data["FunTemperatureTrigger"]);	
		  PREFERED_LIGHT_DORMITOR = sys_data["PREFERED_LIGHT_DORMITOR"];
		  THERMOSTATLAST = sys_data["THERMOSTAT_LAST"];
		  $('#prefLDRShow').text(PREFERED_LIGHT_DORMITOR);
		  $('#beepModeID').val(sys_data["UserBeepMode"]);
		  isLOCAL = jsonData["isLOCAL"];
		    if (isLOCAL) {
		      $('#set_forceMainDoorOpen').prop("disabled", false);
		    } else {
		       $('#set_forceMainDoorOpen').prop("disabled", true);
		    }
			$('#climatizareOption').val(sys_data["CLIMA_MODE"]);
		  $('#force24Thermo').val(sys_data["THERMOSTATFORCE24"]);
		  $("#smartWelcomeEnable").prop('checked',sys_data["smartWelcomeEnable"]);
		  $("#smartWelcomeAutoSetup").prop('checked',sys_data["smartWelcomeAutoSetup"]);
		  
		  $("#welcome_Luni").val(sys_data["Welcome_Time"]["day1"]);
		  $("#welcome_Marti").val(sys_data["Welcome_Time"]["day2"]);
		  $("#welcome_Miercuri").val(sys_data["Welcome_Time"]["day3"]);
		  $("#welcome_Joi").val(sys_data["Welcome_Time"]["day4"]);
		  $("#welcome_Vineri").val(sys_data["Welcome_Time"]["day5"]);
		  $("#welcome_Sambata").val(sys_data["Welcome_Time"]["day6"]);
		  $("#welcome_Duminica").val(sys_data["Welcome_Time"]["day7"]);
		
		  if ($("#smartWelcomeAutoSetup").is(':checked')) {
		   event.preventDefault();
		   $('.smartWelcome').prop("disabled", true);
		  } else {
		    $('.smartWelcome').prop("disabled", false);
		  }
		  
		  $('#idPlsWait').addClass('hidden'); // hide Loading
		}
	/*-----------------------------------------------------------------------------------*/
		window.restoreESP = function (){
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
	/*-----------------------------------------------------------------------------------*/
		window.rebootESP = function (){
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
	/*-----------------------------------------------------------------------------------*/
		window.ClearData = function (){
			if (confirm("Do you really want to clear data on system ?")) {
				let data = {"CLEAR_DATA": 1};
				let _js = JSON.stringify(data);	
				if (websck_is_connected) websocket.send(_js);
				_js	= null;
				data = null;
		    
		    alert("System data has been cleared. Setup again your system.\n" +
		          "System rebooting. Wait ~1 min for refresh.");
		
		    setTimeout(function(){
		      location.reload();
				}, 3000);
			}
		}
	/*-----------------------------------------------------------------------------------*/
		window.rebootInSafeMode = function (){
		  ERROR_INSTANCE = 1;
			let data = {
				"SAFEMODE": 1
			};
			
			let _js = JSON.stringify(data);	
		    if (websck_is_connected) websocket.send(_js);
			_js	= null;
			data = null;
			alert("The system is restarting and will run in AP-SAFEMODE.\n" +
		      "Look for the WIFI SSID 'UPX-SMARTHOME' and connect to it.\n" +
		      "My address for AP is: http://192.168.1.1\n\n" +
		      "Confirm this dialog after you are already connected to 'UPX-SMARTHOME'!");
		
			setTimeout(function(){
				window.location.replace("http://192.168.1.1");
				}, 3000);		  
		}
	/*-----------------------------------------------------------------------------------*/
  /*-----------------------------------------------------------------------------------*/
  /*SET ACTION*/
    /* QUICK SAVING SEND */
    //THERMOSTAT_OUTSIDE_ENABLE
    $("#set_THERMOSTAT_OUTSIDE_ENABLE").on("change", function(e) {
      let data = {
          "THERMOSTAT_OUTSIDE_ENABLE": $('#set_THERMOSTAT_OUTSIDE_ENABLE').is(":checked")
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;          
    });
    
    //CENTRALA_ON_HISTERIZIS
    $('#apply_CENTRALA_ON_HISTERIZIS').on('click', function() {
      let data = {
          "CENTRALA_ON_HISTERIZIS":  parseFloat($("#set_CENTRALA_ON_HISTERIZIS").val())
        };
      let _js = JSON.stringify(data);
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;
      
      $('#apply_CENTRALA_ON_HISTERIZIS').addClass('hidden'); 
    }); 

    //TEMP_INDOOR_CALCULATION_METHOD
    $('#apply_TEMP_INDOOR_CALCULATION_METHOD').on('click', function() {
      let data = {
          "TEMP_INDOOR_CALCULATION_METHOD": parseInt($("#set_TEMP_INDOOR_CALCULATION_METHOD").val(), 10)
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;
      
      $('#apply_TEMP_INDOOR_CALCULATION_METHOD').addClass('hidden'); 
    });
    
    //jalAutoModeRun
    $('#apply_jalAutoModeRun').on('click', function() {
      let data = {
          "jalAutoModeRun": parseInt($("#set_jalAutoModeRun").val(), 10)
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;
      
      $('#apply_jalAutoModeRun').addClass('hidden'); 
    });    
    
    //smartWelcomeEnable & smartWelcomeAutoSetup
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
      PREFERED_LIGHT_DORMITOR = LIVE_DORMITOR_LDR;
      $('#prefLDRShow').text(PREFERED_LIGHT_DORMITOR);
      let data = {
          "PREFERED_LIGHT_DORMITOR": parseInt(PREFERED_LIGHT_DORMITOR, 10)
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;   
    });
 
    //LowLightPoint
    $('#apply_LowLightPoint').on('click', function() {
      let data = {
          "LowLightPoint": parseInt($("#set_LowLightPoint").val(), 10)
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;
      
      $('#apply_LowLightPoint').addClass('hidden'); 
    });

    //jaluzHisterizis
    $('#apply_jaluzHisterizis').on('click', function() {
      let data = {
          "jaluzHisterizis": parseInt($("#set_jaluzHisterizis").val(), 10)
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;
      
      $('#apply_jaluzHisterizis').addClass('hidden'); 
    });
    
    //CLIMA_MODE / climatizareOption
    $("#climatizareOption").on("change", function(slideEvt) {
      let mode = parseInt($(this).val(), 10);
      let data = {
          "CLIMA_MODE": parseInt(mode, 10)
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;
    });
    
    //UserBeepMode
    $("#beepModeID").on("change", function(slideEvt) {
      let mode = parseInt($(this).val(), 10);
      let data = {
          "UserBeepMode": mode
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;
    });

    //forceMainDoorOpen
    //⚠️ nu ar trebui sa re-trimita comanda de zero ptr ca in ESP trebuie asta
    $("#set_forceMainDoorOpen").on("change", function(e) {
      let data = {
          "forceMainDoorOpen": $(this).is(":checked")
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;
      $('#set_forceMainDoorOpen').prop("disabled", true);
      
      // auto-reset
      timers.push(setTimeout(function(){
        let data = {
            "forceMainDoorOpen": false
          };
        let _js = JSON.stringify(data);	
        if (websck_is_connected) websocket.send(_js);
        _js	= null; data = null;
        $('#set_forceMainDoorOpen').prop('checked', false);
        $('#set_forceMainDoorOpen').prop("disabled", false);
      }, 3000));     
    });
    
    //AlowLightOFF
    $("#set_AlowLightOFF").on("change", function(e) {
      let data = {
          "AlowLightOFF": $('#set_AlowLightOFF').is(":checked")
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;          
    });

    //FunTemperatureTrigger
    $('#apply_FunTemperatureTrigger').on('click', function() {
      let data = {
          "FunTemperatureTrigger": parseFloat($("#set_FunTemperatureTrigger").val())
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;
      
      $('#apply_FunTemperatureTrigger').addClass('hidden'); 
    });

    //LivoloTestID
    $('#apply_LivoloTestID').on('click', function() {
      let data = {
          "LivoloTestID": parseInt($("#setLivoloTestID").val(), 10)
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;
      
      $('#apply_LivoloTestID').addClass('hidden'); 
    });
    
    //MaxLogCnt  // aici ai ramas
    $('#apply_MaxLogCnt').on('click', function() {
      let data = {
          "MaxLogCnt": parseInt($("#idMaxLogCnt").val(), 10)
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;
      
      $('#apply_MaxLogCnt').addClass('hidden'); 
    });    
    // THERMOSTATFORCE24
    $("#force24Thermo").on("change", function(slideEvt) {
      let mode = parseInt($(this).val(), 10);
      let data = {
          "THERMOSTATFORCE24": mode
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;
    });  
    
    //KEY110_ENABLE
    $("#setKEY110_ENABLE").on("change", function(e) {
      let data = {
          "KEY110ENABLE": $('#setKEY110_ENABLE').is(":checked")
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;          
    });

    //KEY120_ENABLE
    $("#setKEY120_ENABLE").on("change", function(e) {
      let data = {
          "KEY120ENABLE": $('#setKEY120_ENABLE').is(":checked")
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;          
    });
 
    //KEY130_ENABLE
    $("#setKEY130_ENABLE").on("change", function(e) {
      let data = {
          "KEY130ENABLE": $('#setKEY130_ENABLE').is(":checked")
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;          
    });

    //KEY255_ENABLE
    $("#setKEY255_ENABLE").on("change", function(e) {
      let data = {
          "KEY255ENABLE": $('#setKEY255_ENABLE').is(":checked")
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;          
    });

    //KEY110_NAME
    $('#apply_KEY110NAME').on('click', function() {
      let data = {
          "KEY110_NAME": $("#SetKEY110NAME").val()
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;
      
      $('#apply_KEY110NAME').addClass('hidden'); 
    });

    //KEY120_NAME
    $('#apply_KEY120NAME').on('click', function() {
      let data = {
          "KEY120_NAME": $("#SetKEY120NAME").val()
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;
      
      $('#apply_KEY120NAME').addClass('hidden'); 
    });
    
    //KEY130_NAME
    $('#apply_KEY130NAME').on('click', function() {
      let data = {
          "KEY130_NAME": $("#SetKEY130NAME").val()
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;
      
      $('#apply_KEY130NAME').addClass('hidden'); 
    });

    //KEY255_NAME
    $('#apply_KEY255NAME').on('click', function() {
      let data = {
          "KEY255_NAME": $("#SetKEY255NAME").val()
        };
      let _js = JSON.stringify(data);	
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;
      
      $('#apply_KEY255NAME').addClass('hidden'); 
    });    
    //--> QUICK SAVING SEND 
    
    //SetKEY110NAME
    $("#SetKEY110NAME").on("input", function(slideEvt) {
        $("#apply_KEY110NAME").removeClass('hidden');
    });    

    //SetKEY120NAME
    $("#SetKEY120NAME").on("input", function(slideEvt) {
        $("#apply_KEY120NAME").removeClass('hidden');
    }); 
    
    //SetKEY130NAME
    $("#SetKEY130NAME").on("input", function(slideEvt) {
        $("#apply_KEY130NAME").removeClass('hidden');
    });     

    //SetKEY255NAME
    $("#SetKEY255NAME").on("input", function(slideEvt) {
        $("#apply_KEY255NAME").removeClass('hidden');
    }); 
    
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

    $('#setLivoloTestID').on("change", function(e) {
      $("#apply_LivoloTestID").removeClass('hidden');
    });
    
    $('#idMaxLogCnt').on("change", function(e) {
      $("#apply_MaxLogCnt").removeClass('hidden');
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
        //saveSettings();
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
    document.getElementById('idClearData').addEventListener('click', ClearData);
    document.getElementById('idBtnSafeMod').addEventListener('click', rebootInSafeMode);
} //.inject_function_settings()
/*-----------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------*/
function inject_function_index() {
  console.log("loading action and function index");
  /*-----------------------------------------------------------------------------------*/  
		window.checkValueForBlink = function (value,minVal,MaxVal) {
		    var fVal = parseFloat(value);
		    if ((fVal < minVal) || (fVal > MaxVal)) {
		        return 'blink';
		    } else {
		        return '';
		    }
		}  
  /*-----------------------------------------------------------------------------------*/
		window.temp_resimtita = function (temp,hum,wspeed) {
			var calc_temp = "N/A";
			calc_temp = parseFloat((temp + 0.33*(hum/100.0)*6.105*Math.exp(17.27*temp/(237.7+temp))- 0.70*wspeed - 4.00)).toFixed(2);
			return calc_temp;
		}  
  /*-----------------------------------------------------------------------------------*/
		window.decodeJalModeNow = function (mode) {
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
		window.decodeJalAutoMode = function (mod) {
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
  /*-----------------------------------------------------------------------------------*/      
    window.processCalorPos = function (id,calSt,calReq) {
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
	/*-----------------------------------------------------------------------------------*/	
		window.updLiveParamIndex = function (jsonData) {
		        console.log(jsonData);
		        const live_data = jsonData["live_data"];
						//-->UPDATE ITEMS BY ID & INI 'NAME' ITEM
		        var blinkClass = "";
						var cal1St,cal1Req,cal1Vcc;
						var cal2St,cal2Req,cal2Vcc;
						var cal3St,cal3Req,cal3Vcc;
						var cal4St,cal4Req,cal4Vcc;
						var cal5St,cal5Req,cal5Vcc;
						var cal6St,cal6Req,cal6Vcc;
						 
						 cal1Req = live_data["CALOR1_SET_STATE"];
						 cal2Req = live_data["CALOR2_SET_STATE"];
						 cal3Req = live_data["CALOR3_SET_STATE"];
						 cal4Req = live_data["CALOR4_SET_STATE"];
						 cal5Req = live_data["CALOR5_SET_STATE"];
						 cal6Req = live_data["CALOR6_SET_STATE"];
						 
						 cal1St = live_data["CALOR1_CUR_STATE"];
						 cal2St = live_data["CALOR2_CUR_STATE"];
						 cal3St = live_data["CALOR3_CUR_STATE"];
						 cal4St = live_data["CALOR4_CUR_STATE"];
						 cal5St = live_data["CALOR5_CUR_STATE"];
						 cal6St = live_data["CALOR6_CUR_STATE"];
						 
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
						 				 
						 $("#THERMOSTAT").html(live_data["THERMOSTAT"]);
						 $("#TEMP_BUCATARIE").html(live_data["TEMP_BUCATARIE"]);
						 $("#TEMP_DORMITOR").html('<div>'+live_data["TEMP_DORMITOR"]+'&nbsp;&nbsp;'+processCalorPos("cal6",cal5St,cal5Req)+'</div>');
						 
		         blinkClass = checkValueForBlink(live_data["HUM_DORMITOR2"],20,65);
						 $("#TEMP_DORMITOR2").html('<div class="'+blinkClass+'">'+live_data["TEMP_DORMITOR2"]+
												   '&nbsp;&nbsp;<i class="icon ion-waterdrop"></i>'+live_data["HUM_DORMITOR2"] +
												   '%&nbsp;&nbsp;'+processCalorPos("cal5",cal6St,cal6Req)+'</div>');				 
						 
		         blinkClass = checkValueForBlink(live_data["HOL_HUMIDITY"],20,65);
						 $("#TEMP_HOL").html('<div class="'+blinkClass+'">'+live_data["TEMP_HOL"]+
											 '&nbsp;&nbsp;<i class="icon ion-waterdrop"></i>'+live_data["HOL_HUMIDITY"] +
											 '%&nbsp;&nbsp;'+processCalorPos("cal1",cal1St,cal1Req)+processCalorPos("cal2",cal2St,cal2Req)+
											 processCalorPos("cal3",cal3St,cal3Req)+
											 processCalorPos("cal4",cal4St,cal4Req)+'</div>');
											 
						 $("#TEMP_EXTERN").html(live_data["TEMP_EXTERN"]+'&nbsp;&nbsp;<i class="icon ion-waterdrop"></i>'+live_data["HUMIDITY_EXT"] + '%');
						 blinkClass = checkValueForBlink(live_data["VOLTAGE_BATTERY"],12.0,13.9);
						 $("#VOLTAGE_BATTERY").html('<div class="'+blinkClass+'">'+live_data["VOLTAGE_BATTERY"]+'</div>');
						 blinkClass = checkValueForBlink(live_data["VOLTAGE_RAIL12"],11.8,12.5);
						 $("#VOLTAGE_RAIL12").html('<div class="'+blinkClass+'">'+live_data["VOLTAGE_RAIL12"]+'</div>');				 				 				 
						 blinkClass = checkValueForBlink(live_data["VOLTAGE_MAIN"],14.9,15.6);
						 $("#VOLTAGE_MAIN").html('<div class="'+blinkClass+'">'+live_data["VOLTAGE_MAIN"]+'</div>');
						 
						 $("#CentralaOn").html((live_data["CentralaOn"]?"DA":"NU") + ' de ' + live_data["IncalzireSecondsLastState"]);
						 $("#ClimaON").html((live_data["ClimaOn"]?"DA":"NU"));				 
						 $("#jalAutoModeRun").html(decodeJalAutoMode(live_data["jalAutoModeRun"]));
						 $("#LowLightPoint").html(live_data["LowLightPoint"]);		
		         $("#AlowLightOFF").html((live_data["AlowLightOFF"]?"DA":"NU"));
						 $("#HomeIsAlone").html((live_data["HomeIsAlone"]?"DA":"NU"));
						 $("#jaluzHisterizis").html(live_data["jaluzHisterizis"]);
		    
						 blinkClass = checkValueForBlink(live_data["KEY110BATTERY"],2.75,3.30);
						 $("#KEY110BATTERY").html('<div class="'+blinkClass+'">'+live_data["KEY110BATTERY"]+'</div>');				 				 
						 //--$("#KEY110CONTOR").html(live_data["KEY110CONTOR"]);
						 $("#KEY110LASTSEEN").html(live_data["KEY110LASTSEEN"]);
						 $("#KEY110ENABLE").html((live_data["KEY110ENABLE"]?"DA":"NU"));
						 $("#KEY110HOME").html((live_data["KEY110HOME"]?"DA":"NU") +', de '+live_data['KEY110LASTCHANGE']);
						 $("#KEY110NAME").html(live_data["KEY110NAME"]);
		
						 blinkClass = checkValueForBlink(live_data["KEY120BATTERY"],2.75,3.30);
						 $("#KEY120BATTERY").html('<div class="'+blinkClass+'">'+live_data["KEY120BATTERY"]+'</div>');					 
						 //--$("#KEY120CONTOR").html(live_data["KEY120CONTOR"]);
						 $("#KEY120LASTSEEN").html(live_data["KEY120LASTSEEN"]);
						 $("#KEY120ENABLE").html((live_data["KEY120ENABLE"]?"DA":"NU"));
						 $("#KEY120HOME").html((live_data["KEY120HOME"]?"DA":"NU") +', de '+live_data['KEY120LASTCHANGE']);
						 $("#KEY120NAME").html(live_data["KEY120NAME"]);
		
						 blinkClass = checkValueForBlink(live_data["KEY130BATTERY"],2.75,3.30);
						 $("#KEY130BATTERY").html('<div class="'+blinkClass+'">'+live_data["KEY130BATTERY"]+'</div>'); 
						 //--$("#KEY130CONTOR").html(live_data["KEY130CONTOR"]);
						 $("#KEY130LASTSEEN").html(live_data["KEY130LASTSEEN"]);
						 $("#KEY130ENABLE").html((live_data["KEY130ENABLE"]?"DA":"NU"));
						 $("#KEY130HOME").html((live_data["KEY130HOME"]?"DA":"NU") +', de '+live_data['KEY130LASTCHANGE']);
						 $("#KEY130NAME").html(live_data["KEY130NAME"]);
		
						 blinkClass = checkValueForBlink(live_data["KEY255BATTERY"],2.75,3.30);
						 $("#KEY255BATTERY").html('<div class="'+blinkClass+'">'+live_data["KEY255BATTERY"]+'</div>'); 				 
						 //--$("#KEY255CONTOR").html(live_data["KEY255CONTOR"]);
						 $("#KEY255LASTSEEN").html(live_data["KEY255LASTSEEN"]);
						 $("#KEY255ENABLE").html((live_data["KEY255ENABLE"]?"DA":"NU"));
						 $("#KEY255HOME").html((live_data["KEY255HOME"]?"DA":"NU") +', de '+live_data['KEY255LASTCHANGE']);
						 $("#KEY255NAME").html(live_data["KEY255NAME"]);
		    
						 $("#TEMP_INDOOR_CALCULATION_METHOD").html(live_data["TEMP_INDOOR_CALCULATION_METHOD"]);
						 $("#CENTRALA_ON_HISTERIZIS").html(live_data["CENTRALA_ON_HISTERIZIS"]);
						 $("#THERMOSTAT_OUTSIDE_ENABLE").html((live_data["THERMOSTAT_OUTSIDE_ENABLE"]?"DA":"NU"));
						 //-?$("#ThisUpdateTime").html(live_data["ThisUpdateTime"]);
						 $("#TEMP_GATEWAY").html(live_data["TEMP_GATEWAY"]);
						 $("#TEMP_MATRIX").html((temp_resimtita(parseFloat(live_data["MATRIX_INDOOR"]), parseFloat(live_data["HOL_HUMIDITY"]), 0.2))).toString();
						 $("#jalModeNow").html(decodeJalModeNow(live_data["jalModeNow"]));
		         LIVE_DORMITOR_LDR = live_data["dormitorLDR"];				 
						 $("#dormitorLDR").html(LIVE_DORMITOR_LDR);
		         $("#outdoorLDR").html(live_data["outdoorLDR"]);         
						 $("#MATRIX_INDOOR").html(live_data["MATRIX_INDOOR"]);
						 $("#jalAutoModeRunDSP").html(live_data["jalAutoModeRun"]);    
		         $("#updateTime").text(live_data["LocalTime"]);
		         
		         $('#idPlsWait').addClass('hidden'); // hide Loading
		}
  /*-----------------------------------------------------------------------------------*/	
} //.inject_function_index
/*-----------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------*/
function inject_function_events() {
  console.log("loading action and function events");
    window.parseErrorEvt = function(data, type_events) {
      console.log(data, 'type_events:' + type_events);

      // LIST OF DECODING ERROR HERE     
      const EventLst = {
        0: { // TYPE_INFO
          0: "Reboot, NTP Ready",
          1: "Connect to WIFI-STA"
        },
        1: { // TYPE_WARNING
          0: "Eroare 1:0",
          1: "Eroare 1:1"
        },
        2: { // TYPE_ERROR
          0: "Eroare 2:0",
          1: "Eroare 2:1"
        },
        3: { // TYPE_MISC
          0: "Eroare 3:0",
          1: "Eroare 3:1"
        }        
      }; //.EventLst
      
      const events_info = data['events_info'];
      console.log(events_info);
      return;
      //------>>
      // split data
      const dataarg = data.split(",");
      let datetime  = dataarg[0];
      let eventCode = dataarg[1].trim() * 1;
      //type_events from input
      
      let newLineHtml = datetime + ':' + EventLst[type_events][eventCode];
     
      switch (type_events) {
        case 0: //TYPE_INFO
          $('#idLogInfo').html(newLineHtml);      
        break;

        case 1: //TYPE_WARNING
          $('#idLogWarning').html(newLineHtml);      
        break;
        
        case 2: //TYPE_ERROR
          $('#idLogError').html(newLineHtml);      
        break;

        case 3: //TYPE_MISC
          $('#idLogMisc').html(newLineHtml);      
        break;        
        
        default:
        break;
      } //.sw
    } //.parseErrorEvt
    /*-------------------------------------------------------------------------------*/
    window.loadEvents = function(type_events='ALL_EVENTS') {
				$.ajax({
					url: "http://upx83.go.ro/upx-center/events/event_server.php",
					type: 'post',
					dataType: 'json',
					cache: false,
					timeout: 2000,
					data: {
						'get_events_content': type_events,
					},
					success: function (data) {
						if (data[0] == 'ERROR') {
							//$('#replySpace').html = '';
							//$('#replySpace').append(data[1]);
              console.log(data[0], data[1]);
						} else {
              // fa ceva cu data[2]
              parseErrorEvt(data[2], type_events);
            }				
					},
					error: function(e){
						console.log(e);
					}
				});	
    }; //.loadAllEvent
    /*-------------------------------------------------------------------------------*/
    // CAll Function first
      timers.push(setTimeout(function(){
        loadEvents('ALL_EVENTS'); // first load ALL_EVENTS
        $('#idPlsWait').addClass('hidden'); // hide Loading
      }, 500));      
} //.inject_function_events
/*-----------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------*/  
/* COMMON FUCNTION HERE */
/*ESP WebSocket*/
/*------------------------------------------------------------------------------------*/
  function onOpen(event) {
    websck_is_connected = 1;  
		if (PAGENAME == 'settings') {
      verificaVersiune();
      getSettingsDataCmd();  // pool_info_page() delayed included here
    } else {
      setTimeout(pool_info_page, 250);  //pool_info_page(); //pool now   
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
   
    let el = document.getElementById("idcMillis");
    if (el) el.innerHTML = millis_esp + ' - \u{1F4F6} ' + RSSI + '%';
    
    if (PAGENAME == 'index') {
      if (jsonObject.hasOwnProperty("live_data") == true)
          updLiveParamIndex(jsonObject);
    }
    
    if (PAGENAME == 'settings') {
      if (jsonObject.hasOwnProperty("SYSTEM") == true) parseSettings(jsonObject);
      if (jsonObject.hasOwnProperty("QUICKSYSTEM") == true) parseQuickSys(jsonObject);      
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
		  
    const dataRaw = await fetch('https://mellbo.github.io/upx-repo/SMARTHOME-REPO/firmware/version');
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
				idNewFirmware.classList.remove('hidden');
			}
		}			
    } else {
		console.log("No update available"); 
	}
}
/*-----------------------------------------------------------------------------------*/
function onVisibilityChange() {
  paginaVizibila = !document.hidden;
  ERROR_INSTANCE = 1;
  websocket.close();
  location.replace("/protection");
} 
/*-----------------------------------------------------------------------------------*/
function pool_info_page() {
  if ((ERROR_INSTANCE) || (!websck_is_connected)) return;
  let DATA_SET_TYPE = ONLY_PING;
  
  if (PAGENAME == 'index') DATA_SET_TYPE = LIVE_DATA_TYPE;
  if (PAGENAME == 'settings') DATA_SET_TYPE = GET_DATA_QUICK;
  
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
/*-----------------------------------------------------------------------------------*/
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
function loadNewBackGround() {
  const totalImages = 15;
  const randomNum = Math.floor(Math.random() * (totalImages+1));
  const element = document.querySelector('.home-product');
  if(element) {
    element.style.backgroundImage = `url("https://mellbo.github.io/upx-repo/SMARTHOME-REPO/web-repo/assets/img/background/${randomNum}.jpg")`;
  }  
}
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
/*-----------------------------------------------------------------------------------*/
/* CE FAC CU ASTEA ?!? */
/*
//-FUNCTION FOR CALENDAR
function loadCalendar() {
    console.log("Load Calendar Disabled");
    return;  
	//PRELUARE DATE
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
	// PRELUARE DATE
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

//- FUNCTION FOR LOGS
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
*/
