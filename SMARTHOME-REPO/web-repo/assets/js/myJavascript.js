/* SECTION UPDATE livePARAM */
var DEBUG=1;
var PAGENAME = '';
var PREFERED_LIGHT_DORMITOR = 0;
var LIVE_DORMITOR_LDR = 0;
var idleTime = 0;
var timers = [];
var intervals = [];
var keyNames = [];
/*ESP WebSocket*/
var gateway = window.location.port
  ? `ws://${window.location.hostname}:${window.location.port}/ws`
  : `ws://${window.location.hostname}/ws`;
var websocket;
var websck_is_connected = false;
var millis_esp = 0;
var WSCONNECTED = 0;
var RSSI = 0;
var isLOCAL = 0;
var ERROR_INSTANCE = 0;
/*var paginaVizibila = true;*/
var USR_MAC = "00:00:00:00:00:00";
var FIRST_INIT_LOGS = true;
var PAUSE_POOL_INFO = false;
var EN_SOUND = false;
var LAST_ERRID = -1;
var ERRLST_EXTERMAL = null;

 /*
 This var must be same in Arduino header.h
*/
const LIVE_DATA_TYPE = 1; // index.html - live_data
const GET_DATA_TYPE  = 2; // settings.html - SYSTEM
const GET_DATA_QUICK = 3; // setings.html - qck_set_fdbck
const GET_DATA_LOGS  = 4; // logs.html
const GET_DATA_SUMAR = 5; // dashboard.html
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

    if (PAGENAME != 'logs') {
      setTimeout(function() {
        if (ERRLST_EXTERMAL == null) LoadERRLST_EXTERMAL();
      }, 2000); // delay 2000 ms
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
    window.addEventListener("beforeunload", function() {
        document.removeEventListener("visibilitychange", onVisibilityChange);
    });
}); //end onLoad
/*-----------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------*/
/*FOR SETTINGS PAGE*/
function inject_function_settings() {
  if (DEBUG) console.log("loading action and function settings");
  /*COMMON FUNCTION FOR SETTINGS*/
  /*-----------------------------------------------------------------------------------*/
    window.setIPToGroup = function (selector, arr) {
      const container = document.querySelector(selector);
      if(!container) return;
      const inputs = container.querySelectorAll("input[type=number]");
      for(let i = 0; i < inputs.length && i < arr.length; i++) {
          let val = parseInt(arr[i]) || 0;
          if(val < 0) val = 0;
          if(val > 255) val = 255;
          inputs[i].value = val;
      }
    }
  /*-----------------------------------------------------------------------------------*/
    window.getIPFromGroup = function (selector) {
     // use: getIPFromGroup("#id"), getIPFromGroup(".cls")
     //      you can form string : arr.join('.');
      const container = document.querySelector(selector);
      if(!container) return null;
      const inputs = container.querySelectorAll("input[type=number]");
      const arr = [];
      inputs.forEach(input => {
          let val = parseInt(input.value) || 0;
          if(val < 0) val = 0;
          if(val > 255) val = 255;
          arr.push(val);
      });
      return arr;
    }
  /*-----------------------------------------------------------------------------------*/
    window.btnFuncAddInThermostat = function () {
        let h = window.hoursWheel.getSelected().toString().padStart(2,'0');
        let m = window.minutesWheel.getSelected().toString().padStart(2,'0');
        let temp = window.horizontalWheel.getSelectedValue().toString();
        const timeString = h + ':' + m;
        showConfirm("Introduceti temperatura " + temp + " pentru ora "+timeString+" ?",
            function() {
              let data = {
                  "NewThermostatData": 1,
                  "therm_hour": parseInt(h, 10),
                  "therm_min":  parseInt(m, 10),
                  "therm_temp": parseFloat(parseFloat(temp).toFixed(2))
                };
               window.sendQuickAct(data);
              $('#timePickerModal').modal('hide');
            }, function() {}
        );
    };
   /*-----------------------------------------------------------------------------------*/
    window.btnFuncSelHHSmartWelcome = function (idTarget) {
        let h = window.hoursWheel.getSelected().toString().padStart(2,'0');
        let m = window.minutesWheel.getSelected().toString().padStart(2,'0');
        const timeString = h + ':' + m;
        document.getElementById(idTarget).value = timeString;
        $('#timePickerModal').modal('hide');
    };
   /*-----------------------------------------------------------------------------------*/
    window.confTmPckrOKBtn = function (okFunction, params) {
        /*Use:
          - non param:  window.confTmPckrOKBtn(yourFunction, []);
          - with param: window.confTmPckrOKBtn(yourFunction, [param1, param2, ...]);
        */
        let okBtn = document.getElementById('timePickerOkBtn');
        okBtn.onclick = null;
        okBtn.onclick = function() {
            if (params && params.length > 0) {
              okFunction.apply(null, params);
            } else {
              okFunction();
            }
        };
    };
  /*-----------------------------------------------------------------------------------*/
    window.initTimePicker = function(){
      const hours = Array.from({length:24}, (_,i)=>i);
      const minutes = Array.from({length:60}, (_,i)=>i);
      window.hoursWheel = new WheelPicker('hoursWheel', hours);
      window.minutesWheel = new WheelPicker('minutesWheel', minutes);
      window.horizontalWheel = new HorizontalWheelPicker({
        containerId: 'H-wheel-container',
        min: 12.0,
        max: 38.0,
        step: 0.1,
        initialValue: 12.0
      });
    };

    // ======== MODAL FUNC ========
    window.decodeThermLST = function() {
      const el = document.getElementById("selCalendarItem");
      if (!el || el.selectedIndex < 0) {
        return null;
      }

      const elCaption = el.options[el.selectedIndex].text;
      if (!elCaption) {
        return null;
      }

      const regex = /Ora:\s*(\d{2}):(\d{2})\s*Temperatura:\s*([\d.]+)/;
      const match = elCaption.match(regex);

      if (match) {
        const tOra = parseInt(match[1], 10);
        const tMin = parseInt(match[2], 10);
        const tTemp = parseFloat(parseFloat(match[3]).toFixed(2));
        return { tOra, tMin, tTemp };
      }

      return null;
    };
    /*-----------------------------------------------------------------------------------*/
    window.openTimePicker = function(idCampStart){
      const elVal = document.getElementById(idCampStart).value.split(":");
      const hh = parseInt(elVal[0], 10);
      const mn = parseInt(elVal[1], 10);
      window.hoursWheel.setSelected(hh);
      window.minutesWheel.setSelected(mn);
      document.getElementById('divTempHorizontal').classList.add('hidden');
      $('#timePickerModal').modal('show');
    };
  /*-----------------------------------------------------------------------------------*/
    window.openAddThermoPicker = function(startTemp){
      let curSelTherm = decodeThermLST();
      if (curSelTherm != null) {
        window.hoursWheel.setSelected(curSelTherm.tOra);
        window.minutesWheel.setSelected(curSelTherm.tMin);
        window.horizontalWheel.setToValue(curSelTherm.tTemp-0.3);
      } else {
        const now = new Date();
        window.hoursWheel.setSelected(now.getHours());
        window.minutesWheel.setSelected(now.getMinutes());
        window.horizontalWheel.setToValue(startTemp-0.3); // -0.3 it`s just for calibrate
      }
      document.getElementById('divTempHorizontal').classList.remove('hidden');
      $('#timePickerModal').modal('show');
    };
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
      if (DEBUG) console.log(jsonData);
      const sys_data = jsonData["QUICKSYSTEM"];
      LIVE_DORMITOR_LDR = sys_data["dormitorLDR"];
      $("#dormitorLDR").html(LIVE_DORMITOR_LDR);
      $("#idThermostatCurent").html(sys_data["THERMOSTAT"]+"ºC");

      let en_quick = 0;
      if (sys_data.hasOwnProperty("en_quick") == 1) en_quick = 1;
      if (en_quick) {
        if (DEBUG) console.log("Settings UPD");
        $('#climatizareOption').val(sys_data["CLIMA_MODE"]);
        $('#set_forceMainDoorOpen').prop('checked', sys_data["forceMainDoorOpen"]);
        $('#force24Thermo').val(sys_data["THERMOSTATFORCE24"] ? "1" : "0");
        myfavInfo.play();
      }

      let ThermLST = 0;
      if (sys_data.hasOwnProperty("ThermLST")) ThermLST = 1;
      if (ThermLST) {
        if (DEBUG) console.log("Thermostat UPD");
        const sel = document.getElementById("selCalendarItem");
        sel.innerHTML = "";
        const thermLST = sys_data["ThermLST"];
        if (thermLST && Array.isArray(thermLST)) {
            thermLST.forEach((pair, index) => {
                if (pair.length === 3) {
                    const [hour, min, temp] = pair;
                    const option = document.createElement("option");
                    option.value = index; // index ca value
                    option.text = `Ora: ${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')} Temperatura: ${temp.toFixed(2)}`;
                    sel.appendChild(option);
                }
            });
        }
        myfavInfo.play();
      }
    };
	/*-----------------------------------------------------------------------------------*/
		window.parseSettings = function (jsonData){
			if (jsonData == null) {
		    return;
		  }
		  if (DEBUG) console.log(jsonData);
		  const sys_data = jsonData["SYSTEM"];
		  $("#set_THERMOSTAT_OUTSIDE_ENABLE").prop('checked',sys_data["THERMOSTAT_OUTSIDE_ENABLE"]);
		  $('#set_forceMainDoorOpen').prop('checked', sys_data["forceMainDoorOpen"]);
		  $("#set_AlowLightOFF").prop('checked',sys_data["AlowLightOFF"]);
			$("#setKEY110_ENABLE").prop('checked',sys_data["KEY110ENABLE"]);
			$("#setKEY120_ENABLE").prop('checked',sys_data["KEY120ENABLE"]);
			$("#setKEY130_ENABLE").prop('checked',sys_data["KEY130ENABLE"]);
			$("#setKEY255_ENABLE").prop('checked',sys_data["KEY255ENABLE"]);

			$("#setKEY110_PRINCIPAL").prop('checked',sys_data["KEY110PRINCIPAL"]);
			$("#setKEY120_PRINCIPAL").prop('checked',sys_data["KEY120PRINCIPAL"]);
			$("#setKEY130_PRINCIPAL").prop('checked',sys_data["KEY130PRINCIPAL"]);
			$("#setKEY255_PRINCIPAL").prop('checked',sys_data["KEY255PRINCIPAL"]);

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
		  $('#prefLDRShow').text(PREFERED_LIGHT_DORMITOR);
		  $('#beepModeID').val(sys_data["UserBeepMode"]);
		  isLOCAL = jsonData["isLOCAL"];
		    if (isLOCAL) {
		      $('#set_forceMainDoorOpen').prop("disabled", false);
		    } else {
           $('#set_forceMainDoorOpen').prop("disabled", true);
           $('#set_forceMainDoorOpen').removeClass('btn-success');
           $('#set_forceMainDoorOpen').addClass('btn-danger');
		    }
			$('#climatizareOption').val(sys_data["CLIMA_MODE"]);
		  $('#force24Thermo').val(sys_data["THERMOSTATFORCE24"] ? "1" : "0");
		  $("#smartWelcomeEnable").prop('checked',sys_data["smartWelcomeEnable"]);
		  $("#smartWelcomeAutoSetup").prop('checked',sys_data["smartWelcomeAutoSetup"]);
      $("#set_AlowInfoModal").prop('checked',sys_data["AlowInfoModal"]);

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

      //Thermostat input Data
      const sel = document.getElementById("selCalendarItem");
      sel.innerHTML = "";
      const thermLST = sys_data["ThermLST"];
      if (thermLST && Array.isArray(thermLST)) {
          thermLST.forEach((pair, index) => {
              if (pair.length === 3) {
                  const [hour, min, temp] = pair;
                  const option = document.createElement("option");
                  option.value = index; // index ca value
                  option.text = `Ora: ${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')} Temperatura: ${temp.toFixed(2)}`;
                  sel.appendChild(option);
              }
          });
      }
      //IPMAN
      $("#setDHCP_OFF").prop('checked',sys_data["IPMAN"]["DHCP_OFF"]);
      setIPToGroup("#ip-group", sys_data["IPMAN"]["IP"]);
      setIPToGroup("#subnet-group", sys_data["IPMAN"]["MASK"]);
      setIPToGroup("#gateway-group", sys_data["IPMAN"]["GTWAY"]);

      if ($("#setDHCP_OFF").is(':checked'))
        $('.dhcp_setup').prop("disabled", false); else
          $('.dhcp_setup').prop("disabled", true);

		  $('#idPlsWait').addClass('hidden'); // hide Loading

      // offsets temperature
      $('#edOffsetBucatarie').val(sys_data["ofs_bucatarie"]);
      $('#edOffsetOutDoor').val(sys_data["ofs_living"]);
      $('#edOffsetLiving').val(sys_data["ofs_outdoor"]);
      $('#edOffsetDormitor').val(sys_data["ofs_dormitor"]);
      $('#edOffsetDormitor2').val(sys_data["ofs_dormitor2"]);
		};
	/*-----------------------------------------------------------------------------------*/
		window.restoreESP = function (){
      if (confirm("Do you really want to clear data on system\nand Restore to Default ?")) {
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
		};
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
		};
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
		};
	/*-----------------------------------------------------------------------------------*/
		window.rebootInSafeMode = function (){
      if (confirm("Do you really want to reboot in SAFEMODE ?")) {
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
            "Confirm this dialog AFTER you are already connected to 'UPX-SMARTHOME'!");

        setTimeout(function(){
          window.location.replace("http://192.168.1.1");
          }, 3000);
      }
		};
	/*-----------------------------------------------------------------------------------*/
    window.dtOutInfo = function (txtInfo){
      document.getElementById("dtOut").innerHTML = "<div style='width:98%;' class='alert alert-danger' role='alert'><button type='button' "+
                       "class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>×</span></button>"+
                       "<span>"+txtInfo+"</span></div>"
    };
  /*-----------------------------------------------------------------------------------*/
    window.getMonthName = function () {
      let month = "";
      const monthsName = ["ianuarie","februarie","martie","aprilie","mai","iunie","iulie","august","septembrie","octombrie","noiembrie","decembrie"];
      month = monthsName[new Date().getMonth()];
      return month;
    };
  /*-----------------------------------------------------------------------------------*/
    window.showConfirm = function (msg, callbackOk, callbackCancel) {
      let btnOk = document.getElementById("modalOk");
      let btnCancel = document.getElementById("modalCancel");
      let modalMsg = document.getElementById("modalMsg");

      modalMsg.innerHTML = msg;

      if (callbackCancel === null) {
          btnCancel.classList.add('hidden');
      } else {
          btnCancel.classList.remove('hidden');
      }

      $('#modalConfirm').modal('show');

      function cleanup() {
          btnOk.removeEventListener("click", okHandler);
          btnCancel.removeEventListener("click", cancelHandler);
      }

      function okHandler() {
           $('#modalConfirm').modal('hide');
          callbackOk();
          cleanup();
      }

      function cancelHandler() {
          $('#modalConfirm').modal('hide');
          if (callbackCancel) callbackCancel();
          cleanup();
      }

      btnOk.addEventListener("click", okHandler);
      btnCancel.addEventListener("click", cancelHandler);
    };
  /*-----------------------------------------------------------------------------------*/
    window.sendQuickAct = function (varParDataJS) {
      if (!varParDataJS || Object.keys(varParDataJS).length === 0) {
        if (DEBUG) console.log("sendQuickAct:", "err: no object to send!");
        return;
      }
      let _js = JSON.stringify(varParDataJS);
      //if (DEBUG) console.log("send->", _js);
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;
    };
  /*-----------------------------------------------------------------------------------*/
    window.getSettingsDataCmd = function () {
      if ((ERROR_INSTANCE) || (!websck_is_connected)) return;
      let data = {
        "REQUEST_INFO": GET_DATA_TYPE
      };

      let _js = JSON.stringify(data);
      if (websck_is_connected) websocket.send(_js);
      _js	= null;
      data = null;
      document.getElementById('infoCalMonth').innerHTML = "Intrari in Termostat pentru luna "+ getMonthName();
      setTimeout(pool_info_page, 1000); //delayed start here
    };
  /*-----------------------------------------------------------------------------------*/
  /*-----------------------------------------------------------------------------------*/
  /*SET ACTION*/
    /* QUICK SAVING SEND */
    //THERMOSTAT_OUTSIDE_ENABLE
    $("#set_THERMOSTAT_OUTSIDE_ENABLE").on("change", function(e) {
      let data = {
          "THERMOSTAT_OUTSIDE_ENABLE": $('#set_THERMOSTAT_OUTSIDE_ENABLE').is(":checked")
        };
      sendQuickAct(data);
    });

    //CENTRALA_ON_HISTERIZIS
    $('#apply_CENTRALA_ON_HISTERIZIS').on('click', function() {
      let data = {
          "CENTRALA_ON_HISTERIZIS":  parseFloat($("#set_CENTRALA_ON_HISTERIZIS").val())
        };
      sendQuickAct(data);
      $('#apply_CENTRALA_ON_HISTERIZIS').addClass('hidden');
    });

    //TEMP_INDOOR_CALCULATION_METHOD
    $('#apply_TEMP_INDOOR_CALCULATION_METHOD').on('click', function() {
      let data = {
          "TEMP_INDOOR_CALCULATION_METHOD": parseInt($("#set_TEMP_INDOOR_CALCULATION_METHOD").val(), 10)
        };
      sendQuickAct(data);
      $('#apply_TEMP_INDOOR_CALCULATION_METHOD').addClass('hidden');
    });

    //jalAutoModeRun
    $('#apply_jalAutoModeRun').on('click', function() {
      let data = {
          "jalAutoModeRun": parseInt($("#set_jalAutoModeRun").val(), 10)
        };
      sendQuickAct(data);
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
      sendQuickAct(data);
      $('#smartWelcomeWindow').removeClass('in');
    });

    // PREFERED_LIGHT_DORMITOR
    $('#preff_ldr').on('click', function() {
      PREFERED_LIGHT_DORMITOR = LIVE_DORMITOR_LDR;
      $('#prefLDRShow').text(PREFERED_LIGHT_DORMITOR);
      let data = {
          "PREFERED_LIGHT_DORMITOR": parseInt(PREFERED_LIGHT_DORMITOR, 10)
        };
      sendQuickAct(data);
    });

    //LowLightPoint
    $('#apply_LowLightPoint').on('click', function() {
      let data = {
          "LowLightPoint": parseInt($("#set_LowLightPoint").val(), 10)
        };
      sendQuickAct(data);
      $('#apply_LowLightPoint').addClass('hidden');
    });

    //jaluzHisterizis
    $('#apply_jaluzHisterizis').on('click', function() {
      let data = {
          "jaluzHisterizis": parseInt($("#set_jaluzHisterizis").val(), 10)
        };
      sendQuickAct(data);
      $('#apply_jaluzHisterizis').addClass('hidden');
    });

    //CLIMA_MODE / climatizareOption
    $("#climatizareOption").on("change", function(slideEvt) {
      let mode = parseInt($(this).val(), 10);
      let data = {
          "CLIMA_MODE": parseInt(mode, 10)
        };
      sendQuickAct(data);
    });

    //UserBeepMode
    $("#beepModeID").on("change", function(slideEvt) {
      let mode = parseInt($(this).val(), 10);
      let data = {
          "UserBeepMode": mode
        };
      sendQuickAct(data);
    });

    //forceMainDoorOpen
    //⚠️ nu ar trebui sa re-trimita comanda de zero ptr ca in ESP trebuie asta
    $("#set_forceMainDoorOpen").on("click", function(e) {
      let data = {
          "forceMainDoorOpen": true
        };
      let _js = JSON.stringify(data);
      if (websck_is_connected) websocket.send(_js);
      _js	= null; data = null;
      $('#set_forceMainDoorOpen').prop("disabled", true);
      $('#set_forceMainDoorOpen').removeClass('btn-success');
      $('#set_forceMainDoorOpen').addClass('btn-danger');
      // auto-reset
      timers.push(setTimeout(function(){
        $('#set_forceMainDoorOpen').prop("disabled", false);
        $('#set_forceMainDoorOpen').removeClass('btn-danger');
        $('#set_forceMainDoorOpen').addClass('btn-success');
      }, 10000));
    });

    //AlowLightOFF
    $("#set_AlowLightOFF").on("change", function(e) {
      let data = {
          "AlowLightOFF": $('#set_AlowLightOFF').is(":checked")
        };
      sendQuickAct(data);
    });

    //AlowInfoModal
    $("#set_AlowInfoModal").on("change", function(e) {
      let data = {
          "AlowInfoModal": $('#set_AlowInfoModal').is(":checked")
        };
      sendQuickAct(data);
    });

    //FunTemperatureTrigger
    $('#apply_FunTemperatureTrigger').on('click', function() {
      let data = {
          "FunTemperatureTrigger": parseFloat($("#set_FunTemperatureTrigger").val())
        };
      sendQuickAct(data);
      $('#apply_FunTemperatureTrigger').addClass('hidden');
    });

    //LivoloTestID
    $('#apply_LivoloTestID').on('click', function() {
      let data = {
          "LivoloTestID": parseInt($("#setLivoloTestID").val(), 10)
        };
      sendQuickAct(data);
      $('#apply_LivoloTestID').addClass('hidden');
    });

    //MaxLogCnt  // aici ai ramas
    $('#apply_MaxLogCnt').on('click', function() {
      let data = {
          "MaxLogCnt": parseInt($("#idMaxLogCnt").val(), 10)
        };
      sendQuickAct(data);
      $('#apply_MaxLogCnt').addClass('hidden');
    });

    // THERMOSTATFORCE24
    $("#force24Thermo").on("change", function(slideEvt) {
      let mode = ($(this).val() === "1");
      let data = {
        "THERMOSTATFORCE24": mode
      };
      sendQuickAct(data);
    });

    //KEY110ENABLE
    $("#setKEY110_ENABLE").on("change", function(e) {
      let data = {
          "KEY110ENABLE": $('#setKEY110_ENABLE').is(":checked")
        };
      sendQuickAct(data);
    });

    //KEY120ENABLE
    $("#setKEY120_ENABLE").on("change", function(e) {
      let data = {
          "KEY120ENABLE": $('#setKEY120_ENABLE').is(":checked")
        };
      sendQuickAct(data);
    });

    //KEY130ENABLE
    $("#setKEY130_ENABLE").on("change", function(e) {
      let data = {
          "KEY130ENABLE": $('#setKEY130_ENABLE').is(":checked")
        };
      sendQuickAct(data);
    });

    //KEY255ENABLE
    $("#setKEY255_ENABLE").on("change", function(e) {
      let data = {
          "KEY255ENABLE": $('#setKEY255_ENABLE').is(":checked")
        };
      sendQuickAct(data);
    });

    //KEY110PRINCIPAL
    $("#setKEY110_PRINCIPAL").on("change", function(e) {
      let data = {
          "KEY110PRINCIPAL": $('#setKEY110_PRINCIPAL').is(":checked")
        };
      sendQuickAct(data);
    });

    //KEY120PRINCIPAL
    $("#setKEY120_PRINCIPAL").on("change", function(e) {
      let data = {
          "KEY120PRINCIPAL": $('#setKEY120_PRINCIPAL').is(":checked")
        };
      sendQuickAct(data);
    });

    //KEY130PRINCIPAL
    $("#setKEY130_PRINCIPAL").on("change", function(e) {
      let data = {
          "KEY130PRINCIPAL": $('#setKEY130_PRINCIPAL').is(":checked")
        };
      sendQuickAct(data);
    });

    //KEY255PRINCIPAL
    $("#setKEY255_PRINCIPAL").on("change", function(e) {
      let data = {
          "KEY255PRINCIPAL": $('#setKEY255_PRINCIPAL').is(":checked")
        };
      sendQuickAct(data);
    });

    //KEY110_NAME
    $('#apply_KEY110NAME').on('click', function() {
      let data = {
          "KEY110_NAME": $("#SetKEY110NAME").val()
        };
      sendQuickAct(data);

      $('#apply_KEY110NAME').addClass('hidden');
    });

    //KEY120_NAME
    $('#apply_KEY120NAME').on('click', function() {
      let data = {
          "KEY120_NAME": $("#SetKEY120NAME").val()
        };
      sendQuickAct(data);
      $('#apply_KEY120NAME').addClass('hidden');
    });

    //KEY130_NAME
    $('#apply_KEY130NAME').on('click', function() {
      let data = {
          "KEY130_NAME": $("#SetKEY130NAME").val()
        };
      sendQuickAct(data);
      $('#apply_KEY130NAME').addClass('hidden');
    });

    //KEY255_NAME
    $('#apply_KEY255NAME').on('click', function() {
      let data = {
          "KEY255_NAME": $("#SetKEY255NAME").val()
        };
      sendQuickAct(data);
      $('#apply_KEY255NAME').addClass('hidden');
    });

    $('#reload_callendar').on('click', function(e) {
      PAUSE_POOL_INFO = true;
      dtOutInfo("Wait to reload page..");
    });

    $('#del_itm_calendar').on('click', function(e) {
      let el = document.getElementById("selCalendarItem");
      let elIdxDel = el.value;
      let elCaption = el.options[el.selectedIndex].text;

      if (elIdxDel == 0) {
        showConfirm("Nu puteti sterge pozitia #0 din termostat.<br>"+
                    "Puteti insa modifica temperatura si ora.",
            function() {},null
        );
        return;
      }

      showConfirm("Doresti sa stergi pozitia #"+elIdxDel+"<br>ref: " + elCaption+" ?",
          function() {
            let data = {
              "CAL_DEL_ITEM": parseInt(elIdxDel, 10)
            };
            sendQuickAct(data);
            dtOutInfo("Pos <b>#"+elIdxDel+"</b> was deleted from Calendar");
          },
          function() {}
      );
    });

    // RST_CAL_CURMONTH
    $('#reset_cal_month').on('click', function() {
      showConfirm("Doresti sa resetezi la valorile initiale pentru luna<br>"+
                  "curenta din Calendar-Thermostat ?",
          function() {
            let data = {
              "RST_CAL_CURMONTH": 1
            };
            sendQuickAct(data);
            dtOutInfo("Current month entry was reset.");
          },
          function() {}
      );
    });

    //RST_CAL_ALL
    $('#reset_cal_all').on('click', function() {
      showConfirm("Doresti sa resetezi la valorile initiale pentru toate<br>"+
                  "lunile in Calendar-Thermostat ?",
          function() {
            let data = {
              "RST_CAL_ALL": 1
            };
            sendQuickAct(data);
            dtOutInfo("RST All month in Calendar<br>System reboot now !");
          },
          function() {}
      );
    });

    //save_dhcp_mode
    $('#save_dhcp_mode').on('click', function() {
      showConfirm("Atentie. La urmatorul restart conectarea WLAN se va face<br>"+
                  "in baza IP/SUBNET/GATEWAY introduse!<br>Continuati ?",
          function() {
            let ipEntry = {
                "DHCP_OFF": $('#setDHCP_OFF').is(":checked"),
                "IP": getIPFromGroup('#ip-group'),
                "MASK": getIPFromGroup('#subnet-group'),
                "GTWAY": getIPFromGroup('#gateway-group')
            };
            let data = {
              "save_dhcp_mode": 1,
              "IPMAN": ipEntry
            };
            sendQuickAct(data);
          },
          function() {}
      );
    });

    //save_offsets
    $('#save_offsets').on('click', function() {
      showConfirm("Atentie. Modificarea offset-urilor la senzorii de temperatura<br>"+
                  "poate genera erori daca introduceti valori nemasurate<br>Continuati ?",
          function() {
            let data = {
              "save_offsets": 1,
              "ofs_bucatarie": parseFloat(document.getElementById('edOffsetBucatarie').value),
              "ofs_living": parseFloat(document.getElementById('edOffsetLiving').value),
              "ofs_outdoor": parseFloat(document.getElementById('edOffsetOutDoor').value),
              "ofs_dormitor": parseFloat(document.getElementById('edOffsetDormitor').value),
              "ofs_dormitor2": parseFloat(document.getElementById('edOffsetDormitor2').value),
            };
            sendQuickAct(data);
            let panel = document.getElementById("offsetAcordeon");
            panel.classList.remove("in");
            panel.setAttribute("aria-expanded", "false");
          },
          function() {}
      );
    });
    //---------------------------------------
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
        let panel = document.getElementById("metodaCalculBtn");
        panel.classList.add("in");
        panel.style.height = panel.scrollHeight + "px";
        panel.setAttribute("aria-expanded", "true");
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

    $('#setLivoloTestID').on("change", function(e) {
      $("#apply_LivoloTestID").removeClass('hidden');
    });

    $('#idMaxLogCnt').on("change", function(e) {
      $("#apply_MaxLogCnt").removeClass('hidden');
    });

    $("#adaugaInThermostat").on('click', function(e) {
      window.confTmPckrOKBtn(window.btnFuncAddInThermostat, []);
      window.openAddThermoPicker(21.8);
    });

    $("#smartWelcomeAutoSetup").on("change",function(e){
        if ($("#smartWelcomeAutoSetup").is(':checked')) {
          event.preventDefault();
          $('.smartWelcome').prop("disabled", true);
        } else {
          $('.smartWelcome').prop("disabled", false);
        }
     });

    $(".smartWelcome").click(function() {
      if (!document.getElementById('smartWelcomeAutoSetup').checked) {
        //event.preventDefault();
        const elId = this.id;
        window.confTmPckrOKBtn(window.btnFuncSelHHSmartWelcome, [elId]);
        window.openTimePicker(elId);
      }
    });

    $(".dhcp_setup").on("input", function() {
        let val = $(this).val();
        val = val.replace(/\D/g, "");
        if(val.length > 3) val = val.slice(0, 3);
        if(parseInt(val) > 255) val = "255";
        $(this).val(val);
    });

    $(".OffsetTemp").on("input", function() {
      let val = $(this).val();
      val = val.replace(/[^0-9\.\-]/g, "");
      val = val.replace(/(?!^)-/g, "");
      let parts = val.split('.');
      if(parts.length > 2) val = parts[0] + '.' + parts[1];
      if(parts[1]) parts[1] = parts[1].slice(0,2);
      val = parts.join('.');
      let num = parseFloat(val);
      if(!isNaN(num)) {
        if(num > 2.0) val = "2.0";
        if(num < -2.0) val = "-2.0";
      }
      $(this).val(val);
    });


    //$("#ip-group input:last").on("blur", function() {
    $("#ip-group input[type=number]").on("blur", function() {
        let arrUsrIP = getIPFromGroup("#ip-group");
        arrUsrIP[3] = 1;
        setIPToGroup("#gateway-group", arrUsrIP);
    });

    //setDHCP_OFF
    $("#setDHCP_OFF").on("change", function(e) {
      if ($("#setDHCP_OFF").is(':checked')) {
        //event.preventDefault();
        $('.dhcp_setup').prop("disabled", false);
      } else {
        $('.dhcp_setup').prop("disabled", true);
      }
    });

    document.getElementById('idRestoreESP').addEventListener('click', restoreESP);
    document.getElementById('idRebootESP').addEventListener('click', rebootESP);
    document.getElementById('idClearData').addEventListener('click', ClearData);
    document.getElementById('idBtnSafeMod').addEventListener('click', rebootInSafeMode);
    initTimePicker();

    //formam link in idInfoIP
    const el = document.getElementById("idInfoIP");
    const text = el.innerText;
    const parts = text.split(":");
    const ip = (parts.length > 1) ? parts[1] : parts[0];
    const port = (parts.length > 2) ? parts[2] : "";
    const urllink = "http://" + ip + ((port !== "") ? ":" + port : "");
    el.href = urllink;
} //.inject_function_settings()
/*-----------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------*/
function inject_function_index() {
  if (DEBUG) console.log("loading action and function index");
  /*-----------------------------------------------------------------------------------*/
		window.checkValueForBlink = function (value,minVal,MaxVal) {
		    var fVal = parseFloat(value);
		    if ((fVal < minVal) || (fVal > MaxVal)) {
		        return 'blink';
		    } else {
		        return '';
		    }
		};
  /*-----------------------------------------------------------------------------------*/
		window.temp_resimtita = function (temp,hum,wspeed) {
			var calc_temp = "N/A";
			calc_temp = parseFloat((temp + 0.33*(hum/100.0)*6.105*Math.exp(17.27*temp/(237.7+temp))- 0.70*wspeed - 4.00)).toFixed(2);
			return calc_temp;
		};
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
		};
  /*-----------------------------------------------------------------------------------*/
    window.processCalorPos = function (id,calSt,calReq) {
		 var res = "";
		  if (calSt == 1) {
			 res = '<i id="'+id+'" class="icon ion-ios-flame" style="margin: 0px 5px 0px;color: #ff5c38;"></i>';
		  }
		  if (calSt == 2) {
			 res = '<i id="'+id+'" class="icon ion-ios-flame" style="margin: 0px 5px 0px;color: #cecece;"></i>';
		  }
		  if (calSt != calReq) {
			res = '<i id="'+id+'" class="icon ion-ios-flame blink" style="margin: 0px 5px 0px;color: #ffcc1e;"></i>';
		  }
		  if (calSt == 0) {
			 res = '<i id="'+id+'" class="icon ion-android-warning" style="margin: 0px 3px 0px;color: #ffffff;"></i>';
		  }
		  return res;
		};
	/*-----------------------------------------------------------------------------------*/
		window.parseLiveParamIndex = function (jsonData) {
		    if (DEBUG) console.log(jsonData);
		    const live_data = jsonData["live_data"];
		    let blinkClass = "";
				let cal1St,cal1Req,cal1Vcc;
				let cal2St,cal2Req,cal2Vcc;
				let cal3St,cal3Req,cal3Vcc;
				let cal4St,cal4Req,cal4Vcc;
				let cal5St,cal5Req,cal5Vcc;
				let cal6St,cal6Req,cal6Vcc;

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

        $("#THERMOSTAT").html(live_data["THERMOSTAT"].toFixed(2));
        $("#TEMP_BUCATARIE").html(live_data["TEMP_BUCATARIE"].toFixed(2));
        $("#TEMP_DORMITOR").html('<div>'+live_data["TEMP_DORMITOR"].toFixed(2)+'&nbsp;&nbsp;'+processCalorPos("cal6",cal5St,cal5Req)+'</div>');

        blinkClass = checkValueForBlink(live_data["HUM_DORMITOR2"],20,65);
        $("#TEMP_DORMITOR2").html('<div class="'+blinkClass+'">'+live_data["TEMP_DORMITOR2"].toFixed(2)+
                    '&nbsp;&nbsp;<i class="icon ion-waterdrop"></i>'+live_data["HUM_DORMITOR2"] +
                    '%&nbsp;&nbsp;'+processCalorPos("cal5",cal6St,cal6Req)+'</div>');

        blinkClass = checkValueForBlink(live_data["HOL_HUMIDITY"],20,65);
        $("#TEMP_HOL").html('<div class="'+blinkClass+'">'+live_data["TEMP_HOL"].toFixed(2)+
                '&nbsp;&nbsp;<i class="icon ion-waterdrop"></i>'+live_data["HOL_HUMIDITY"] +
                '%&nbsp;&nbsp;'+processCalorPos("cal1",cal1St,cal1Req)+processCalorPos("cal2",cal2St,cal2Req)+
                processCalorPos("cal3",cal3St,cal3Req)+
                processCalorPos("cal4",cal4St,cal4Req)+'</div>');

        $("#TEMP_EXTERN").html(live_data["TEMP_EXTERN"].toFixed(2)+'&nbsp;&nbsp;<i class="icon ion-waterdrop"></i>'+live_data["HUMIDITY_EXT"] + '%');
        blinkClass = checkValueForBlink(live_data["VOLTAGE_BATTERY"],12.0,13.9);
        $("#VOLTAGE_BATTERY").html('<div class="'+blinkClass+'">'+live_data["VOLTAGE_BATTERY"].toFixed(2)+'</div>');
        blinkClass = checkValueForBlink(live_data["VOLTAGE_RAIL12"],11.8,12.5);
        $("#VOLTAGE_RAIL12").html('<div class="'+blinkClass+'">'+live_data["VOLTAGE_RAIL12"].toFixed(2)+'</div>');
        blinkClass = checkValueForBlink(live_data["VOLTAGE_MAIN"],14.9,15.6);
        $("#VOLTAGE_MAIN").html('<div class="'+blinkClass+'">'+live_data["VOLTAGE_MAIN"].toFixed(2)+'</div>');
        $("#CentralaOn").html((live_data["CentralaOn"]?"DA":"NU") + ' de ' + live_data["tmLstHeatChg"]);
        $("#ClimaON").html((live_data["ClimaOn"]?"DA":"NU"));
        $("#jalAutoModeRun").html(decodeJalAutoMode(live_data["jalAutoModeRun"]));
        $("#LowLightPoint").html(live_data["LowLightPoint"]);
        $("#AlowLightOFF").html((live_data["AlowLightOFF"]?"DA":"NU"));
        $("#HomeIsAlone").html((live_data["HomeIsAlone"]?"DA":"NU"));
        $("#jaluzHisterizis").html(live_data["jaluzHisterizis"]);

        blinkClass = checkValueForBlink(live_data["KEY110BATTERY"],2750,3300);
        $("#KEY110BATTERY").html('<div class="'+blinkClass+'">'+live_data["KEY110BATTERY"]+'</div>');
        $("#KEY110LASTSEEN").html(live_data["KEY110LASTSEEN"]);
        $("#KEY110ENABLE").html((live_data["KEY110ENABLE"]?"DA":"NU"));
        $("#KEY110HOME").html((live_data["KEY110HOME"]?"DA":"NU") +', de '+live_data['KEY110LASTCHANGE']);
        $("#KEY110NAME").html(live_data["KEY110NAME"]);

        blinkClass = checkValueForBlink(live_data["KEY120BATTERY"],2750,3300);
        $("#KEY120BATTERY").html('<div class="'+blinkClass+'">'+live_data["KEY120BATTERY"]+'</div>');
        $("#KEY120LASTSEEN").html(live_data["KEY120LASTSEEN"]);
        $("#KEY120ENABLE").html((live_data["KEY120ENABLE"]?"DA":"NU"));
        $("#KEY120HOME").html((live_data["KEY120HOME"]?"DA":"NU") +', de '+live_data['KEY120LASTCHANGE']);
        $("#KEY120NAME").html(live_data["KEY120NAME"]);

        blinkClass = checkValueForBlink(live_data["KEY130BATTERY"],2750,3300);
        $("#KEY130BATTERY").html('<div class="'+blinkClass+'">'+live_data["KEY130BATTERY"]+'</div>');
        $("#KEY130LASTSEEN").html(live_data["KEY130LASTSEEN"]);
        $("#KEY130ENABLE").html((live_data["KEY130ENABLE"]?"DA":"NU"));
        $("#KEY130HOME").html((live_data["KEY130HOME"]?"DA":"NU") +', de '+live_data['KEY130LASTCHANGE']);
        $("#KEY130NAME").html(live_data["KEY130NAME"]);

        blinkClass = checkValueForBlink(live_data["KEY255BATTERY"],2750,3300);
        $("#KEY255BATTERY").html('<div class="'+blinkClass+'">'+live_data["KEY255BATTERY"]+'</div>');
        $("#KEY255LASTSEEN").html(live_data["KEY255LASTSEEN"]);
        $("#KEY255ENABLE").html((live_data["KEY255ENABLE"]?"DA":"NU"));
        $("#KEY255HOME").html((live_data["KEY255HOME"]?"DA":"NU") +', de '+live_data['KEY255LASTCHANGE']);
        $("#KEY255NAME").html(live_data["KEY255NAME"]);

        $("#TEMP_INDOOR_CALCULATION_METHOD").html(live_data["TEMP_INDOOR_CALCULATION_METHOD"]);
        $("#CENTRALA_ON_HISTERIZIS").html(live_data["CENTRALA_ON_HISTERIZIS"].toFixed(2));
        $("#THERMOSTAT_OUTSIDE_ENABLE").html((live_data["THERMOSTAT_OUTSIDE_ENABLE"]?"DA":"NU"));
        //-?$("#ThisUpdateTime").html(live_data["ThisUpdateTime"]);
        $("#TEMP_GATEWAY").html(live_data["TEMP_GATEWAY"].toFixed(2));
        $("#TEMP_MATRIX").html((temp_resimtita(parseFloat(live_data["MATRIX_INDOOR"]), parseFloat(live_data["HOL_HUMIDITY"]), 0.2))).toString();
        $("#jalModeNow").html(decodeJalModeNow(live_data["jalModeNow"]));
        LIVE_DORMITOR_LDR = live_data["dormitorLDR"];
        $("#dormitorLDR").html(LIVE_DORMITOR_LDR);
        $("#outdoorLDR").html(live_data["outdoorLDR"]);
        $("#MATRIX_INDOOR").html(live_data["MATRIX_INDOOR"]);
        $("#jalAutoModeRunDSP").html(live_data["jalAutoModeRun"]);
        $("#updateTime").text(live_data["LocalTime"]);
        let FLAG_PRIOUSR_RETURN = live_data["FLAG_PRIOUSR_RETURN"];
        $("#idPriUsr").text(live_data["USR_PRINCIPAL_IN_HOME"]?"DA":"NU")+"/"+FLAG_PRIOUSR_RETURN?"DA":"NU";
        $("#idLastUART").text(live_data["LAST_RCV_UART"]+'ms');
        $("#idCALORRCV").text(live_data["tsCALORRCV"]+'ms');

        $('#idPlsWait').addClass('hidden'); // hide Loading

		};
 /*-----------------------------------------------------------------------------------*/
} //.inject_function_index
/*-----------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------*/
function inject_function_events() {
      if (DEBUG) console.log("loading action and function events");
      window.alignCollumnLog = function () {
        const panel1 = document.getElementById("idPanelLogInfo");
        const panel2 = document.getElementById("idPanelLogWarning");
        const panel3 = document.getElementById("idPanelLogError");

        const heights = [
          panel1.offsetHeight,
          panel2.offsetHeight,
          panel3.offsetHeight
        ];

        let maxHeight = Math.max(heights[0], heights[1], heights[2]);

        panel1.style.height  = maxHeight + "px";
        panel2.style.height  = maxHeight + "px";
        panel3.style.height  = maxHeight + "px";
      };

      window.parseEvtJS = function (jsonData){
        if (jsonData == null) {
          return;
        }
        if (DEBUG) console.log(jsonData);
        const evt_data = jsonData["EVTDATA"];
        keyNames = [...evt_data["keyNames"]]; //send NameOfKeys
        if (evt_data.hasOwnProperty("newEventInfo") == true) {
          FIRST_INIT_LOGS = true;
        }
      };

      window.secToDateTimeStr = function (seconds) {
        if (typeof seconds !== "number" || Number.isNaN(seconds)) {
          return "Invalid";
        }
        let days = Math.floor(seconds / 86400);
        let remainder = seconds % 86400;
        let hours = Math.floor(remainder / 3600);
        remainder = remainder % 3600;
        let minutes = Math.floor(remainder / 60);
        let secs = remainder % 60;

        let result = "";
        if (days > 0) {
          result += days + "D ";
        }

        result += String(hours).padStart(2, "0") + ":" +
              String(minutes).padStart(2, "0") + ":" +
              String(secs).padStart(2, "0");

        return result;
    };

    window.parseErrorEvt = async function(data, type_events) {
      let EventLst;

      try {
        const response = await fetch("http://upx83.go.ro/upx-center/events/evt_translate.lst");
        const text = await response.text();
        EventLst = (new Function("return " + text))();
      } catch {
        if (DEBUG) console.log("evt_translate.lst error on reading");
        return;
      }

      //subroutine 0
      function decodeThermEntry(num) { // for shown
          let str = num.toString();
          if (str.length !== 9) {
              return "decodeThermEntry fail. wrong input";
          }

          let ora = str.substring(1, 3);
          let minut = str.substring(3, 5);
          let tempInt = parseInt(str.substring(5, 9));
          let temp = (tempInt / 100).toFixed(2);

          return `${ora}:${minut} ${temp}ºC`;
      }

      //soubroutine 1
      function insHtmlEvt(newLineHtml, type_events, rst=false){
        switch (type_events) {
          case 'events_info': //TYPE_INFO * insHtmlEvt
            if (rst) $('#idLogInfo').html(newLineHtml); else
                      $('#idLogInfo').append('<br>'+newLineHtml);
          break;

          case 'events_warning': //TYPE_WARNING * insHtmlEvt
            if (rst) $('#idLogWarning').html(newLineHtml); else
                      $('#idLogWarning').append('<br>'+newLineHtml);
          break;

          case 'events_error': //TYPE_ERROR * insHtmlEvt
            if (rst) $('#idLogError').html(newLineHtml); else
                      $('#idLogError').append('<br>'+newLineHtml);
          break;

          case 'events_misc': //TYPE_MISC * insHtmlEvt
            if (rst) $('#idLogMisc').html(newLineHtml); else
                      $('#idLogMisc').append('<br>'+newLineHtml);
          break;

          default:
            if (DEBUG) console.log("Err: type_events");
          break;
        } //.sw
      } //.insHtmlEvt

     // soubroutine 2
     function cnvBool2Long(xData) {
        let newData = '';
        if (xData >= 0) {
          if (xData > 1) {
            newData = " :" + xData.toString();
          } else {
            newData = " :" + (xData === 1 ? "True" : "False");
          }
        }
       return newData;
     }

     // soubroutine 3
     function keyInOut(xData) {
        let newData = '';
        newData = " :" + (xData === 1 ? " JOIN" : " LEAVE");
       return newData;
     }

     // soubroutine 4
     function decodeEventValue(value, zvalue, type_events, eventCode) {
        switch (type_events) {
          //TYPE_INFO * decodeEventValue
          case 'events_info':
            switch (eventCode) {
              case 2:   // ⚖️Histerizis set
              case 3:   // ️Mehtod indoor calc
              case 6:   // 🌓Pref LightBedroom
              case 7:   //🌤️Set Day/Light Val
              case 8:   //⚖Histerizis Jal
              case 13:  // 💡LivoloTestID
              case 14:  //📝Set MaxLogCnt
                return ': ' + value.toString();
              break;
              case 9: //❄️Clima Mod
                switch (value){
                  case 0: return ": OPRITA";
									case 1: return ": 21ºC";
									case 2: return ": 22ºC";
									case 3: return ": 23ºC";
									case 4: return ": 24ºC";
									case 5: return ": 24.5ºC";
									case 6: return ": 25ºC";
									case 7: return ": 25.5ºC";
									case 8: return ": 26ºC";
									case 9: return ": ENERGY SAViNG";
									case 10:return ": Pornit 1 ora";
									case 11:return ": AUTO HEATING";
                }//end.sw-value
              break;
              case 10: //🎶UserBeep Mode
                switch(value) {
                  case 0: return ": No Beep";
                  case 1: return ": System Beep";
                  case 2: return ": Warning Beep"
                  case 3: return ": All Beep";
                }//end.sw-10
              break;
              case 4: // ️🌤️jalAutoModeRun
                return ': ' + decodeJalAutoMode(value);
              case 20:  // 🌡️🧑Thermo add‍
                return ': ' + decodeThermEntry(value);
              case 21:  // 🌡️🧑Thermo DEL‍
                return ': ' + value.toString();

              default:
                /*
                // true|false
                case: 1:🌡️Thermostat Outside, 5:🕒USR Change SmartWelcome, 11:💡Allow LightOff,
                      12:🌬️FunTemperatureTrigger, 15:🔥THERMOSTATFORCE24, 16-19 🗝️KEYXXX Renamed,
                      22:❌️🧑️‍💻RST current Mohth, 23:❌🧑️‍💻RST ALL Mohth, 25:ℹ️🖥️Alow Info dialog,

                */
                return cnvBool2Long(value);
              break;
            }//.sw.eventCode
          break; //.events_info

          //TYPE_WARNING * decodeEventValue
          case 'events_warning':
            switch (eventCode) {
              //case ...
              default:
                /*
                //true|false
                case 4-7: 🗝️KEYXXXENABLE
                case 8-11: 🗝️KEYXXXPRINCIPAL
                case 12: ⚠️💻DHCP IP CONFIG
                case 13: ♻️🌦️SYNK Weather FAILED
                case 14: <NOT ALOCATED>
                case 15: <NOT ALOCATED>
                case 16- 26 Voltage monitoring..
                case 27:🌡️🧑‍💻 Offsets Sensor Changed
                */
                return cnvBool2Long(value);
              break;
            }
          break; //.events_warning

          //TYPE_ERROR * decodeEventValue
          case 'events_error':
            switch (eventCode) {
              case 2:
              case 3:
                switch (value) {
                  case 1: return ": #1-HOL-USA INTRARE";
                  case 2: return ": #2-HOL-CANAPEA";
                  case 3: return ": #3-HOL-BALCON";
                  case 4: return ": #4-HOLMIC-BAIE";
                  case 5: return ": #5-DORMITOR";
                  case 6: return ": #6-DORMITOR2";
                  default: break;
                }
              break;
              default:
                return cnvBool2Long(value);
              break;
            }
          break; //.events_error

          //TYPE_MISC * decodeEventValue
          case 'events_misc':
            switch (eventCode) {
              case 0:
              case 1:
              case 2:
              case 3: // 🌡️🧑UsrKEYxxx Leave/Return
                let keyName = "-N/A";
                if (keyNames && keyNames.length > 0) {
                  keyName = keyNames[eventCode];
                }

                return  '-' + keyName +' ' + keyInOut(value) + ' after ' + secToDateTimeStr(zvalue);
              break;
              default:
                return cnvBool2Long(value);
              break;
            }
          break; //.events_misc

          //DEFAULT * decodeEventValue
          default:
            if (DEBUG) console.log("Err: decodeEventValue type_events");
          break;
        }
     } //.decodeEventValue

    // Main function begin here -->
      let event_keys = [type_events];
      if (type_events == "ALL_EVENTS") {
        event_keys = ["events_info", "events_warning", "events_error", "events_misc"];
      }
      event_keys.forEach(event_key => {
        const eventsRawArr = data[event_key];
        if (!eventsRawArr?.length) {
          if (DEBUG) console.log('No event in array');
          return;  // no data
        }

        for (let i = 0; i < eventsRawArr.length; i++) {
          lineRaw = eventsRawArr[i];
          const dataarg = lineRaw.split(",");
          let datetime  = dataarg[0];
          let eventCode = dataarg[1].trim() * 1;
          let xData     = dataarg[2].trim() * 1;
          let zData     = dataarg[3].trim() * 1;
          let newData = "";
          newData = decodeEventValue(xData, zData, event_key, eventCode).toString();
          let newLineHtml = datetime + ':' + EventLst[event_key][eventCode] + newData;
          insHtmlEvt(newLineHtml, event_key, !(i?true:false));
        }

        if (type_events != "ALL_EVENTS") {
          if (event_key == 'events_info')  $('#idLogInfo').append('<br>ℹ️ Reload -INFO- Done.');
          if (event_key == 'events_warning') $('#idLogWarning').append('<br>ℹ️ Reload -WARN- Done.');
          if (event_key == 'events_error') $('#idLogError').append('<br>ℹ️ Reload -ERROR- Done.');
          if (event_key == 'events_misc') $('#idLogMisc').append('<br>ℹ️ Reload -MISC- Done.');
        }
      }); //.forEach
    }; //.parseErrorEvt
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
            'user_mac': USR_MAC
					},
					success: function (data) {
						if (data[0] == 'ERROR') {
							//$('#replySpace').html = '';
							//$('#replySpace').append(data[1]);
              if (DEBUG) console.log(data[0], data[1]);
						} else {
              //window.parseErrorEvt(data[2], type_events);
              window.parseErrorEvt(data[2], type_events).then(function() {
                window.alignCollumnLog();
              }).catch(function(err) {
                if (DEBUG) console.error(err);
              });
            }
					},
					error: function(e){
						if (DEBUG) console.log(e.responseText);
					}
				});
    }; //.loadAllEvent

   /*SET ACTION*/
  // Action & Button
    $('#btnKeyInfo').on('click', function() {
        loadEvents('events_misc');
    });

    $('#btnLogInfo').on('click', function() {
        loadEvents('events_info');
    });

    $('#btnLogWarning').on('click', function() {
        loadEvents('events_warning');
    });

    $('#btnLogError').on('click', function() {
        loadEvents('events_error');
    });
    /*-------------------------------------------------------------------------------*/
} //.inject_function_events
/*-----------------------------------------------------------------------------------*/

/*-----------------------------------------------------------------------------------*/
/* COMMON FUCNTION HERE | NOT INJECTED ANYWHERE*/
/*ESP WebSocket*/
/*------------------------------------------------------------------------------------*/
  function onOpenWS(event) {
    websck_is_connected = 1;
		if (PAGENAME == 'settings') {
      verificaVersiune();
      getSettingsDataCmd();  // --> pool_info_page() delayed included here
    } else {
      setTimeout(pool_info_page, 250);  //pool_info_page(); //pool now
    }
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
    if (jsonObject.hasOwnProperty("USR_MAC") == true)
        USR_MAC = jsonObject["USR_MAC"];
    if (jsonObject.hasOwnProperty("wsCnt") == true)
        WSCONNECTED = jsonObject["wsCnt"];

    let el = document.getElementById("idcMillis");
    if (el) el.innerHTML = millis_esp + ' - \u{1F4F6} ' + RSSI + '%' + ' \u{1F534} LIVE (' + WSCONNECTED + ')';

    if ((ERRLST_EXTERMAL !==null) && (PAGENAME != 'logs')) {
      if (jsonObject.hasOwnProperty("ERRLST_IDX") == true) {
        let ERRLST_IDX = parseInt(jsonObject["ERRLST_IDX"], 10);
        if (LAST_ERRID != ERRLST_IDX) {
          LAST_ERRID = ERRLST_IDX;
          // convert ERRLST_IDX to message here then
          let errMSGCnv = ERRLST_EXTERMAL[ERRLST_IDX];
          showInfoAutoClose(10, true, errMSGCnv, false, null, null);
        }
      }
    }

    if (PAGENAME == 'index') {
      if (jsonObject.hasOwnProperty("live_data") == true)
          parseLiveParamIndex(jsonObject);
    }

    if (PAGENAME == 'settings') {
      if (jsonObject.hasOwnProperty("SYSTEM") == true) parseSettings(jsonObject);
      if (jsonObject.hasOwnProperty("QUICKSYSTEM") == true) parseQuickSys(jsonObject);
    }

    if (PAGENAME == 'logs') {
      //EVTDATA
      if (jsonObject.hasOwnProperty("EVTDATA") == true) parseEvtJS(jsonObject);

      if ((USR_MAC != "00:00:00:00:00:00") && (FIRST_INIT_LOGS)) {
        FIRST_INIT_LOGS = false;
        timers.push(setTimeout(function(){
          loadEvents('ALL_EVENTS'); // first load ALL_EVENTS
          $('#idPlsWait').addClass('hidden'); // hide Loading
        }, 500));
      }

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
    if (DEBUG) console.log("Check VERSION..");
    if (ini.version !== VERSION) {
      if (DEBUG) console.log("Update available!");
      const idNewFirmware = document.getElementById("idNewFirmware");
      if (idNewFirmware) {
        const idNewFirmwareURL = document.getElementById("idNewFirmwareURL");
        if (idNewFirmwareURL) {
          idNewFirmwareURL.href = ini.url;
          idNewFirmware.classList.remove('hidden');
        }
      }
    } else {
      if (DEBUG) console.log("No update available");
    }
  }
/*-----------------------------------------------------------------------------------*/
  function onVisibilityChange() {
    /*paginaVizibila = !document.hidden;*/
    ERROR_INSTANCE = 1;
    websocket.close();
    location.replace("/protection");
  }
/*-----------------------------------------------------------------------------------*/
  function pool_info_page() {
    if ((ERROR_INSTANCE) || (!websck_is_connected)) return;
    if (PAUSE_POOL_INFO === true) return;

    let DATA_SET_TYPE = ONLY_PING;

    if (PAGENAME == 'index') DATA_SET_TYPE = LIVE_DATA_TYPE;
    if (PAGENAME == 'settings') DATA_SET_TYPE = GET_DATA_QUICK;
    if (PAGENAME == 'logs') DATA_SET_TYPE = GET_DATA_LOGS;

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
        if (DEBUG) console.log('Rebooting WebPage');
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
        return 'SYS AUTO';
      break;

      default:
        return 'POSITION';
      break;
    }
  }
/*-----------------------------------------------------------------------------------*/
// showInfoAutoClose * showInfoAutoClose * showInfoAutoClose
//ex: showInfoAutoClose(10, true, "mesaj", null, null); ||
//    showInfoAutoClose(10, false, "mesaj", function(){}, null);
//    showInfoAutoClose(10, false, "mesaj", function(){}, function(){});
/*-----------------------------------------------------------------------------------*/
function autoFitText() {
  var minSize = 18;
  var maxSize = 30;
  var el = document.getElementById("lblInfoAutoClose");
  var size = maxSize;
  el.style.fontSize = size + "px";
  while ((el.scrollWidth > el.offsetWidth) && (size > minSize)) {
    size--;
    el.style.fontSize = size + "px";
  }
}
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


async function LoadERRLST_EXTERMAL() {
  try {
    const response = await fetch("https://mellbo.github.io/upx-repo/SMARTHOME-REPO/web-repo/assets/js/ERRLST.lst");
    const text = await response.text();
    const tmpJSObj = (new Function("return " + text))();
    ERRLST_EXTERMAL = Object.values(tmpJSObj);
    if (DEBUG) console.log("ERRLST_EXTERMAL Loaded");
  } catch (e) {
    if (DEBUG) console.log("ERRLST_EXTERMAL ERR:", e.message);
    return;
  }
}

/*
//-MUST DELETE AFTER CONFIRM WORK WITH NEW VERSION
async function LoadERRLST_EXTERMAL() {
  try {
    const response = await fetch("https://mellbo.github.io/upx-repo/SMARTHOME-REPO/web-repo/assets/js/ERRLST.lst");
    const text = await response.text();
    ERRLST_EXTERMAL = (new Function("return " + text))();
    if (DEBUG) console.log("ERRLST_EXTERMAL Loaded");
  } catch {
    if (DEBUG) console.log("Eroare la citire fisier");
    return;
  }
}
*/
/*-----------------------------------------------------------------------------------*/
// END showInfoAutoClose * END showInfoAutoClose
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
      snd.onload = function() {
        if (DEBUG) console.log("sound_library OK");
      };
      document.body.appendChild(snd);
  }, 3000); // delay 2000 ms
/*------------------------------------------------------------------------------------*/
/*Unlock Sound Here*/
function handleClickOnce(event) {
	document.removeEventListener("click", handleClickOnce);
	document.removeEventListener("touchstart", handleClickOnce);
	EN_SOUND = true;
}

document.addEventListener("click", handleClickOnce);
document.addEventListener("touchstart", handleClickOnce);