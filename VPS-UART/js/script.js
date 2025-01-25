var websocket,gateway=`ws://${window.location.hostname}/ws`,millis_esp=0,DFU_MODE=0;function onOpen(e){console.log("Connection opened")}function onClose(e){console.log("Connection closed"),setTimeout(initWebSocket,2e3)}function initWebSocket(){console.log("Trying to open a WebSocket connection..."),(websocket=new WebSocket(gateway)).onopen=onOpen,websocket.onclose=onClose,websocket.onmessage=onMessage}function onMessage(e){let t=JSON.parse(e.data);millis_esp=parseInt(t.cMs,10),DFU_MODE=t.DFU_MODE,document.getElementById("cMillis").innerText=t.cMs,document.getElementById("idVPS_state").innerHTML=t.VPS_CONNECTED,document.getElementById("idRSSI_level").innerHTML=t.SIGNALPWR+"%",document.getElementById("idDFU_state").innerHTML=t.DFU_MODE,document.getElementById("idBATT_VCC").innerHTML=t.BATT_VCC+"V",t=null}function mapRange(e,t,n,o,i){return(e-t)*(i-o)/(n-t)+o}function InitiateWithData(){let e=document.getElementById("idInitData").value,t=parseInt(e.split("::")[0],10),n=Math.max(0,Math.min(100,mapRange(t,-100,-40,0,100))),o=Math.round(n).toString()+"%",i=e.split("::")[1]?"NOT CONNECTED":"CONNECTED",l=e.split("::")[2]?"TX/RX":"DFU ON",s=parseInt(e.split("::")[3]),d=parseInt(e.split("::")[4]),a=parseFloat(e.split("::")[5]);document.getElementById("idVPS_state").innerHTML=i,document.getElementById("idRSSI_level").innerHTML=o,document.getElementById("idDFU_state").innerHTML=l,document.getElementById("idPortCom").value=s,document.getElementById("idPortSpeed").value=d,document.getElementById("idBATT_VCC").innerHTML=a,window.DFU_MODE=l}function initButton(){document.getElementById("idBtnARMING").addEventListener("click",setDFUNow),document.getElementById("idRestoreESP").addEventListener("click",restoreESP),document.getElementById("idRebootESP").addEventListener("click",rebootESP),document.getElementById("idBtnSafeMod").addEventListener("click",rebootInSafeMode),document.getElementById("idBtnSavePortCOM").addEventListener("click",doSavePortCOM),document.getElementById("idPortSpeed").addEventListener("change",doSavePortSpeed)}function doSavePortSpeed(){let e={PORTSPEED:document.getElementById("idPortSpeed").value},t=JSON.stringify(e);websocket.send(t),t=null,e=null}function doSavePortCOM(){let e={COMPORT:document.getElementById("idPortCom").value},t=JSON.stringify(e);websocket.send(t),t=null,e=null}function setDFUNow(){if("DFU ON"==document.getElementById("idDFU_state").textContent)return;let e={DFU_MODE:1},t=JSON.stringify(e);websocket.send(t),t=null,e=null,alert("DFU mode is ON. Return to Arduino IDE and press UPLOAD firmware\nif target is allready connected.\nInfo: You can allways type 'DFU' in ArduinoIDE console\n\tfor Enable DFU like here..")}function restoreESP(){let e={RESET:1},t=JSON.stringify(e);websocket.send(t),t=null,e=null,alert("The system is resetting and restarting, approximately 1 minute.\nAfter restoration, you may need to enter SAFEMODE\nto input the configuration data for Internet WIFI.\nMy address in AP mode is: http://192.168.1.1"),setTimeout((function(){window.location.replace("http://192.168.1.1")}),3e3)}function rebootESP(){let e={RESTART:1},t=JSON.stringify(e);websocket.send(t),t=null,e=null,alert("The system is restarting, 40 seconds.\nRefresh the page after the time has elapsed."),setTimeout((function(){location.reload()}),3e3)}function rebootInSafeMode(){let e={SAFEMODE:1},t=JSON.stringify(e);websocket.send(t),t=null,e=null,alert("The system is restarting and will run in AP-SAFEMODE.\nLook for the WIFI SSID 'UPX-GATEWAY' and connect to it.\nMy address for AP is: http://192.168.1.1\n\nConfirm this dialog after you are already connected to 'UPX-GATEWAY'!"),setTimeout((function(){window.location.replace("http://192.168.1.1")}),3e3)}function checkMillis(){let e=millis_esp;void 0===checkMillis.lastMillis&&(checkMillis.lastMillis=0),e===checkMillis.lastMillis?("TX/RX"==DFU_MODE&&alert("LEGATURA A FOST INTRERUPTA"),location.reload(!0)):checkMillis.lastMillis=e,setTimeout(checkMillis,1500)}function getAutoData(){let e={getParam:1},t=JSON.stringify(e);websocket.send(t),t=null,e=null,setTimeout(checkMillis,1e3)}$((function(){setTimeout((function(){getAutoData(),checkMillis()}),1e3)})),$(document).ready((function(){InitiateWithData(),initButton(),initWebSocket()}));