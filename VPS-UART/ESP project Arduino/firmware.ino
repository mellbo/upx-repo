/*
IDE Arduino 1.8.13
board: ESP 8266 comunity 2.7.4, selected Node MCU 1.0 ESP12E
*/

#include <Arduino.h>
#include <ESP8266WiFi.h>

#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ESP8266mDNS.h>
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <string.h>

/* PINS */
#define RST_PIN 14
#define PIN_LED 2

extern "C" {
#include "user_interface.h"
}

//#define DEBUG
#define PORTCLOSE_AFTER  5000

char * TxtFromMem_P(PGM_P format_P, ...);

enum stSense {
  OFF,
  STA,
  AP
};

enum _stLED {
	LEDOFF,
	LEDON,
	LED_PULSESLOW,
	LED_PULSEFAST
} stLED;

/*SETTINGS STRUCTURE*/
typedef struct _DataStruct {
  /*Network*/
  char STASSID [34] = {0};
  char STAPSK[34] = {0};
  char WEBPASSWORD[34] = {0};
  uint16_t SERVERPORT = 80;			/* http server page */
  /*SYSTEM*/
  uint8_t SYS_MODE = (uint8_t) STA; /*0:OFF, 1:STA, 2:AP*/
  /*COM SETTINGS*/
  uint16_t COMPORT  = 1001;
  uint32_t COMSPEED = 115200;
};
_DataStruct SETTINGS;

/*LIVE DATA STRUCTURE*/
typedef struct _LiveStruct { 			/* __attribute__((aligned?packed))*/
  int16_t SIGNALPWR = 0;				// signal of wifi in procented
  byte VPS_CONNECTED = 0;				// state of VPS port connexion server
  byte DFU_MODE = 0;					// 0:Tx/Rx, 1:DFU

} ;
_LiveStruct LIVE;

uint8_t mac[] = {0x38, 0x33, 0x16, 0x33, 0x36, 0x33};
#define SETINGS_FILE "/settings.json"
#define WIFI_CHANNEL  11
#define RETRYCNT_TO_STA	4
const char* APSTASSID = "UPX-VPS-GATEWAY";
const char* mDNSName = "upx-vps";
#define APPSTASPWD ""

uint32_t cMs = millis();
uint32_t lastActivityTime = 0;
uint32_t lstRSTinit = 0;

uint8_t NEED_SAVE_SETTINGS = 0;
bool REQUIRE_RESET_SYSTEM = false;
void settingsSAVE();

// Create AsyncWebServer object on port 80
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
WiFiServer *serverVSP;

uint16_t wsconnected = 0;

const char index_html[] PROGMEM =
#include "website/index.h";

#include "website/webh/safemode_min.html.gz.h"

bool FSMOUNT = false;
stSense aWIFIMODE = OFF;
uint32_t CNTTRYCONN = 0;
uint8_t DFU_IN_PROGRESS = 0;
/*-----------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------*/
void anouncerUPX() {
  HTTPClient http;
  http.useHTTP10(true);
  http.begin("http://upx83.go.ro/upx-center/recovery.php");
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  char def_name[100];
  sprintf_P(def_name, PSTR("code=%s&pass=%s&ip=%d.%d.%d.%d"), WiFi.macAddress().c_str(), SETTINGS.WEBPASSWORD,
            WiFi.localIP()[0], WiFi.localIP()[1], WiFi.localIP()[2], WiFi.localIP()[3]);
  http.POST(String(def_name));
  http.end();
}
/*-----------------------------------------------------------------------------*/
char * TxtFromMem_P(PGM_P format_P, ...) {

  char format[strlen_P(format_P) + 1];
  memcpy_P(format, format_P, sizeof(format));

  va_list args;
  va_start(args, format_P);
  char test[1];
  int  len = ets_vsnprintf(test, 1, format, args) + 1;

  char * buffer = new char[len];
  ets_vsnprintf(buffer, len, format, args);

  va_end(args);
  return buffer;
  delete[] buffer;
}
/*-----------------------------------------------------------------*/
/*every x time send to webpage | see sendUpdate()*/
void notifyClients() {
  if ((WiFi.status() == WL_CONNECTED) &&
      (wsconnected > 0) && (aWIFIMODE == STA)) {
    const size_t capacity = JSON_OBJECT_SIZE(3) + JSON_ARRAY_SIZE(2) + 2000;
    DynamicJsonDocument jsonDocTx(capacity);
    char output[capacity];

    LIVE.SIGNALPWR = (int16_t) WiFi.RSSI();
    jsonDocTx["cMs"] = cMs;
    jsonDocTx["SIGNALPWR"] = String(constrain(map(LIVE.SIGNALPWR, -100, -40, 0, 100), 0, 100));
    jsonDocTx["VPS_CONNECTED"] = String(LIVE.VPS_CONNECTED ? "CONNECTED" : "NOT CONNECTED");
    jsonDocTx["DFU_MODE"] = String(LIVE.DFU_MODE ? "DFU ON" : "TX/RX");

    serializeJson(jsonDocTx, output, capacity);
    if (ws.availableForWriteAll()) {
      ws.textAll(output);
    } else {
	  #ifdef DEBUG
      Serial.printf(TxtFromMem_P(PSTR("...queue is full\r\n")));
	  #endif
    }
    jsonDocTx.clear();
    memset(output, 0, sizeof(output));
  }
}
/*-----------------------------------------------------------------*/
/*mesaje primite prin websocket*/
void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
  AwsFrameInfo *info = (AwsFrameInfo*)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
    data[len] = 0;
    //-->
    String _json = "";
    if (info->opcode == WS_TEXT) {
      for (size_t i = 0; i < info->len; i++) {
        _json += (char)data[i];
      }

      const size_t capacity = JSON_OBJECT_SIZE(3) + JSON_ARRAY_SIZE(2) + 2000;
      DynamicJsonDocument jsonDocRx(capacity);
      DeserializationError error = deserializeJson(jsonDocRx, _json);
      _json = "";

      if (error) {
		#ifdef DEBUG
        Serial.print(F("deserializeJson() failed: "));
        Serial.println(error.f_str());
		#endif
        return;
      }

      /*Conectare Router WIFI*/
      if (jsonDocRx.containsKey("STASSID")) {
        strlcpy(SETTINGS.STASSID, jsonDocRx["STASSID"].as<char*>(), sizeof(SETTINGS.STASSID));
        NEED_SAVE_SETTINGS = 1;
      }
      if (jsonDocRx.containsKey("STAPSK")) {
        strlcpy(SETTINGS.STAPSK, jsonDocRx["STAPSK"].as<char*>(), sizeof(SETTINGS.STAPSK));
        NEED_SAVE_SETTINGS = 1;
      }
      /*Parola acces system*/
      if (jsonDocRx.containsKey("WEBPASSWORD")) {
        strlcpy(SETTINGS.WEBPASSWORD, jsonDocRx["WEBPASSWORD"].as<char*>(), sizeof(SETTINGS.WEBPASSWORD));
        NEED_SAVE_SETTINGS = 1;
      }
      /*reseToDefault by Web*/
      if (jsonDocRx.containsKey("RESET")) {
        bool en = jsonDocRx["RESET"].as<bool>();
        if (en) {
		  #ifdef DEBUG
          Serial.println();
          Serial.println(F("RESTORE SYSTEM"));
		  #endif
          server.end();
          LittleFS.format();
          REQUIRE_RESET_SYSTEM = true;
          //ESP.restart();
          return;
        }
      }
      /*just restart ESP*/
      if (jsonDocRx.containsKey("RESTART")) {
        bool en = jsonDocRx["RESTART"].as<bool>();
        if (en) {
          REQUIRE_RESET_SYSTEM = true;
          //ESP.restart();
          return;
        }
      }
      /*run in SAFEMODE*/
      if (jsonDocRx.containsKey("SAFEMODE")) {
        bool en = jsonDocRx["SAFEMODE"].as<bool>();
        if (en) {
          SETTINGS.SYS_MODE = (uint8_t) AP;
          settingsSAVE();
          delay(10);
          REQUIRE_RESET_SYSTEM = true;
          //ESP.restart();
          return;
        }
      }
      /*PORTSPEED SET*/
      if (jsonDocRx.containsKey("PORTSPEED")) {
        uint16_t _newSPEED = (uint16_t) jsonDocRx["PORTSPEED"].as<unsigned short>();
        SETTINGS.COMSPEED = _newSPEED;
        NEED_SAVE_SETTINGS = 1;
      }
      /*COMPORT SET*/
      if (jsonDocRx.containsKey("COMPORT")) {
        uint16_t _newPortCOM = (uint16_t) jsonDocRx["COMPORT"].as<unsigned short>();
        SETTINGS.COMPORT = _newPortCOM;
        NEED_SAVE_SETTINGS = 1;
      }
      /*DFU_MODE SET*/
      if (jsonDocRx.containsKey("DFU_MODE")) {
        byte _newDFU = (byte) jsonDocRx["DFU_MODE"].as<unsigned short>();
        LIVE.DFU_MODE = _newDFU;
      }

      jsonDocRx.clear();
      delay(10);
      if (NEED_SAVE_SETTINGS == 1) settingsSAVE();

      /* Some example.. ?
      	const char* toggle = jsonDocRx["live"]["toggle"];
      	if(strcmp(toggle, "1") == 0) { // "1" is value
      	}
      */
    }
    //-->
  }
}
/*-----------------------------------------------------------------*/
void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type,
             void *arg, uint8_t *data, size_t len) {

  char buff[80];
  switch (type) {
    case WS_EVT_CONNECT:
      wsconnected++;
	  #ifdef DEBUG
      memset (buff, 0, sizeof (buff));
      snprintf_P(buff, sizeof(buff),
                 PSTR("WebSocket client #%u-%u connected from %s\n"),
                 client->id(), wsconnected, client->remoteIP().toString().c_str());
      Serial.println(buff);
	  memset (buff, 0, sizeof (buff));
	  #endif
      break;
    case WS_EVT_DISCONNECT:
      if (wsconnected > 0) wsconnected--;
	  #ifdef DEBUG
      memset (buff, 0, sizeof (buff));
      snprintf_P(buff, sizeof(buff), PSTR("WebSocket client #%u disconnected\n"), client->id());
      Serial.println(buff);
	  memset (buff, 0, sizeof (buff));
	  #endif
      break;
    case WS_EVT_DATA:
      handleWebSocketMessage(arg, data, len);
      break;
    case WS_EVT_PONG:
    case WS_EVT_ERROR:
      break;
  }
}
/*-----------------------------------------------------------------*/
void notFound(AsyncWebServerRequest* request) {
  request->send(404, "text/plain", "Not found");
}
/*-----------------------------------------------------------------*/
void initWebSocket() {
  ws.onEvent(onEvent);
  server.addHandler(&ws);
}
/*-----------------------------------------------------------------*/
String initVarsInHtml(const String& var) {
  #ifdef DEBUG
  Serial.print(F("Request %"));
  Serial.print(var);
  Serial.println(F("%"));
  #endif

  if (var == "INITDATA") { // SIGNALPWR::VPS_CONNECTED::DFU_MODE::COMPORT::COMSPEED
    char buff[50];
    char number[8];

    memset(buff, 0 , sizeof(buff));
	memset(number, 0 , sizeof(number));
    itoa(LIVE.SIGNALPWR, number, 10);
    strcat(buff, number);
    strcat(buff, "::");
	
	memset(number, 0 , sizeof(number));
    itoa(LIVE.VPS_CONNECTED, number, 10);
    strcat(buff, number);
    strcat(buff, "::");
	
	memset(number, 0 , sizeof(number));
    itoa(LIVE.DFU_MODE, number, 10);
    strcat(buff, number);
    strcat(buff, "::");
	
	memset(number, 0 , sizeof(number));
    itoa(SETTINGS.COMPORT, number, 10);
    strcat(buff, number);
    strcat(buff, "::");
	
	memset(number, 0 , sizeof(number));
    itoa(SETTINGS.COMSPEED, number, 10);
    strcat(buff, number);
    return String(buff);
  }

  /**/

  if (var == "SSID") {
    return String(SETTINGS.STASSID);
  }
  if (var == "SSPSK") {
    return String(SETTINGS.STAPSK);
  }
  if (var == "WEBPASS") {
    return String(SETTINGS.WEBPASSWORD);
  }
}
/*-----------------------------------------------------------------*/
void sendUpdate() {
  if (aWIFIMODE != STA) return;
  static uint32_t lstTick = millis();
  if ((cMs - lstTick) > 1000UL) {
    lstTick = cMs;
    notifyClients();
  }
}
/*-----------------------------------------------------------------*/
void settingsSAVE() {
  if (!FSMOUNT) return;
  File f = LittleFS.open(SETINGS_FILE, "w");
  if (!f) {
	#ifdef DEBUG
    Serial.println(F("Error opening file for writing"));
	#endif
    return;
  }
  const size_t capacity = JSON_OBJECT_SIZE(3) + JSON_ARRAY_SIZE(2) + 2000;
  DynamicJsonDocument jsonToFile(capacity);
  char output[capacity];

  #ifdef DEBUG
  Serial.println(F("SETTINGS SAVE"));
 #endif
  //Network
  jsonToFile["STASSID"] = SETTINGS.STASSID;
  jsonToFile["STAPSK"] = SETTINGS.STAPSK;
  jsonToFile["WEBPASSWORD"] = SETTINGS.WEBPASSWORD;
  jsonToFile["SERVERPORT"] = SETTINGS.SERVERPORT;
  //ACTION
  jsonToFile["SYS_MODE"] = SETTINGS.SYS_MODE;
  jsonToFile["COMPORT"]	 = SETTINGS.COMPORT;
  jsonToFile["COMSPEED"] = SETTINGS.COMSPEED;

  serializeJson(jsonToFile, output, capacity);

  if (!f.print(output)) {
	#ifdef DEBUG
    Serial.println(F("File write failed"));
	#endif
  }
  NEED_SAVE_SETTINGS = 0;
  f.close();
  jsonToFile.clear();
  memset(output, 0, sizeof(output));
}
/*-----------------------------------------------------------------*/
void settingREAD() {
  if (!FSMOUNT) return;
  if (LittleFS.exists(SETINGS_FILE)) {
    File f = LittleFS.open(SETINGS_FILE, "r");
    if (!f) {
	  #ifdef DEBUG
      Serial.print(F("Unable To Open Settings"));
      Serial.println();
	  #endif
      return;
    } else {
      const size_t capacity = JSON_OBJECT_SIZE(3) + JSON_ARRAY_SIZE(2) + 2000;
      DynamicJsonDocument jsonFromFile(capacity);
      String s;
      while (f.position() < f.size())
      {
        s = f.readStringUntil('\n');
        s.trim();
      }
	  #ifdef DEBUG
      Serial.print(F("file size: ")); Serial.println(f.size());
	  #endif
      f.close();

      DeserializationError error = deserializeJson(jsonFromFile, s);
	  #ifdef DEBUG
      Serial.println(s);
	  #endif
      s = "";
      if (error) {
		#ifdef DEBUG
        Serial.print(F("load: deserializeJson() failed: "));
        Serial.println(error.f_str());
        Serial.println(F("Formating.."));
		#endif
        jsonFromFile.clear();
        LittleFS.format();
        return;
      }

      //PARSE SETTINGS
      //Network
      if ((jsonFromFile.containsKey("STASSID")) && (jsonFromFile["STASSID"].is<char*>())) {
        strlcpy(SETTINGS.STASSID, jsonFromFile["STASSID"].as<char*>(), sizeof(SETTINGS.STASSID));
      }
      if ((jsonFromFile.containsKey("STAPSK")) && (jsonFromFile["STAPSK"].is<char*>())) {
        strlcpy(SETTINGS.STAPSK, jsonFromFile["STAPSK"].as<char*>(), sizeof(SETTINGS.STAPSK));
      }
      if ((jsonFromFile.containsKey("WEBPASSWORD")) && (jsonFromFile["WEBPASSWORD"].is<char*>())) {
        strlcpy(SETTINGS.WEBPASSWORD, jsonFromFile["WEBPASSWORD"].as<char*>(), sizeof(SETTINGS.WEBPASSWORD));
      }
      if ((jsonFromFile.containsKey("SERVERPORT")) && (jsonFromFile["SERVERPORT"].is<unsigned short>())) {
        SETTINGS.SERVERPORT = jsonFromFile["SERVERPORT"].as<unsigned short>();
      }
      //ACTION
      if ((jsonFromFile.containsKey("SYS_MODE")) && (jsonFromFile["SYS_MODE"].is<unsigned short>())) {
        SETTINGS.SYS_MODE = (uint8_t) jsonFromFile["SYS_MODE"].as<unsigned char>();
      }
      if ((jsonFromFile.containsKey("COMPORT")) && (jsonFromFile["COMPORT"].is<unsigned short>())) {
        SETTINGS.COMPORT = (uint16_t) jsonFromFile["COMPORT"].as<unsigned short>();
      }
      if ((jsonFromFile.containsKey("COMSPEED")) && (jsonFromFile["COMSPEED"].as<unsigned long>())) {
        SETTINGS.COMSPEED = (uint32_t) jsonFromFile["COMSPEED"].as<unsigned long>();
      }

	  #ifdef DEBUG
      Serial.print(F("ssid:")); Serial.println(SETTINGS.STASSID);
      Serial.print(F("sspass:")); Serial.println(SETTINGS.STAPSK);
	  #endif
      jsonFromFile.clear();
    } // can open
  } else { /* if file exists */
    WiFi.persistent(true);
    WiFi.disconnect();
    WiFi.mode(WIFI_OFF);
    WiFi.persistent(false);
    settingsSAVE();
    ESP.restart();
  }
}
/*-----------------------------------------------------------------*/
void initVariant() {
  WiFi.mode(WIFI_AP);
  wifi_set_macaddr(SOFTAP_IF, &mac[0]);
}
/*-----------------------------------------------------------------*/
void connect_wifi(stSense mod) {
  // WIFI as APP
  WiFi.persistent(false);
  WiFi.disconnect(true);
  WiFi.softAPdisconnect(true);
  WiFi.mode(WIFI_OFF);
  delay(1);
  uint32_t startProgram = millis();
  long rssi;
  switch (mod) {
    case STA:
      // Connect to Wi-Fi /*set temperature zone*/
      WiFi.mode(WIFI_STA);
      WiFi.hostname("UPX-VPS-GATEWAY");
      WiFi.begin(SETTINGS.STASSID, SETTINGS.STAPSK);
	  #ifdef DEBUG
      Serial.println(F("Connecting to WiFi"));
	  #endif
      while (WiFi.status() != WL_CONNECTED) {
        if ((WiFi.status() == 4) || (WiFi.status() == 1)) { /* 4=wrongPass | 1=noSSID */
          if (CNTTRYCONN >= RETRYCNT_TO_STA) {
			#ifdef DEBUG
            Serial.println();
            Serial.println(F("SSID or SSPSK Wrong. Switch to AP."));
			#endif
            connect_wifi(AP);
            return;
          }
        }
        delay(1);
		stLED = LED_PULSEFAST;
		led();		
		#ifdef DEBUG
        Serial.print(F("."));
		#endif
        if ((millis() - startProgram) >= 30000UL) {
		  #ifdef DEBUG
          Serial.println();
          Serial.println(F("No wifi? - Reboot"));
		  #endif
          CNTTRYCONN++;
          ESP.rtcUserMemoryWrite(0, &CNTTRYCONN, sizeof(CNTTRYCONN));
          ESP.restart();
        }
      }
	  rssi = WiFi.RSSI();
	  #ifdef DEBUG
      Serial.println();
      Serial.println(WiFi.localIP());
      Serial.print(F("RSSI:"));
      Serial.println(rssi);
	  #endif
      aWIFIMODE = STA;
      CNTTRYCONN = 0;
      ESP.rtcUserMemoryWrite(0, &CNTTRYCONN, sizeof(CNTTRYCONN));
	  stLED = LEDON;
	  led();
	  MDNS.begin(mDNSName);
      anouncerUPX();
      break;

    case AP:
      WiFi.mode(WIFI_AP);
      IPAddress Ip(192, 168, 1, 1);
      IPAddress NMask(255, 255, 255, 0);
      WiFi.softAPConfig(Ip, Ip, NMask);
      WiFi.softAP(APSTASSID, APPSTASPWD, WIFI_CHANNEL, false, 8);
      WiFi.softAPmacAddress(mac);
      IPAddress myIP = WiFi.softAPIP();
	  #ifdef DEBUG
      Serial.println();
      Serial.print(F("AP IP address: "));
      Serial.println(myIP);
	  #endif
      aWIFIMODE = AP;
      CNTTRYCONN = 0;
      ESP.rtcUserMemoryWrite(0, &CNTTRYCONN, sizeof(CNTTRYCONN));
	  stLED = LEDON;
	  led(); 	  
      break;
  } // end.sw
  WiFi.setSleepMode(WIFI_NONE_SLEEP);
}
/*-----------------------------------------------------------------*/
void checkRouterLive() {
  if ((aWIFIMODE == STA) && ((WiFi.status() != WL_CONNECTED) || (WiFi.status() == WL_DISCONNECTED))) {
    //WIFI_Connect();
    aWIFIMODE == OFF;
    connect_wifi(aWIFIMODE);
  }
}
/*-----------------------------------------------------------------*/
static void handle_update_progress_cb(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final) {
  uint32_t free_space = (ESP.getFreeSketchSpace() - 0x1000) & 0xFFFFF000;
  if (!index) {
	#ifdef DEBUG
    Serial.println(F("Update"));
	#endif
    Update.runAsync(true);
    if (!Update.begin(free_space)) {
	  #ifdef DEBUG
      Update.printError(Serial);
	  #endif
    }
  }

  if (Update.write(data, len) != len) {
	#ifdef DEBUG
    Update.printError(Serial);
	#endif
  }

  if (final) {
    if (!Update.end(true)) {
	  #ifdef DEBUG
      Update.printError(Serial);
	  #endif
    } else {
	  #ifdef DEBUG
      Serial.println(F("Update complete"));
	  #endif
      SETTINGS.SYS_MODE = (uint8_t) STA;
      settingsSAVE();
      delay(10);
    }
  }
}
/*-----------------------------------------------------------------*/
void setDefaultSettings() {
  SETTINGS.SERVERPORT = 80;
  SETTINGS.COMSPEED = 115200;
  SETTINGS.COMPORT = 1001;
  SETTINGS.SYS_MODE = (uint8_t) STA;
  strlcpy(SETTINGS.STASSID, TxtFromMem_P(PSTR("default")), sizeof(SETTINGS.STASSID));
  strlcpy(SETTINGS.STAPSK, TxtFromMem_P(PSTR("")), sizeof(SETTINGS.STAPSK));
  strlcpy(SETTINGS.WEBPASSWORD, TxtFromMem_P(PSTR("12345678")), sizeof(SETTINGS.WEBPASSWORD));
}
/*-----------------------------------------------------------------*/
void setup() {
  #ifdef DEBUG
  Serial.begin(115200);
  Serial.println(F("UPX-VPS-GATEWAY"));
  #endif
  pinMode(RST_PIN, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(RST_PIN, 1);
  
  FSMOUNT = LittleFS.begin();
  if (!FSMOUNT) {
	#ifdef DEBUG
    Serial.println("Error mounting the file system");
	#endif
  }
  setDefaultSettings();
  settingREAD();

  ESP.rtcUserMemoryRead(0, &CNTTRYCONN, sizeof(CNTTRYCONN));
  if ((CNTTRYCONN > RETRYCNT_TO_STA) || (CNTTRYCONN < 0)) CNTTRYCONN = 0;
  #ifdef DEBUG
  Serial.print(F("CNTTRYCONN: "));
  Serial.println(CNTTRYCONN);
  #endif
  connect_wifi((stSense)SETTINGS.SYS_MODE);
  serverVSP = new WiFiServer((uint16_t)SETTINGS.COMPORT); //vps port
  serverVSP->begin();
  initWebSocket();

  // Route for root / web page
  if (aWIFIMODE == STA) { 
    server.on("/", HTTP_GET, [](AsyncWebServerRequest * request) {
      if (!request->authenticate("admin", SETTINGS.WEBPASSWORD))
        return request->requestAuthentication();
      request->send_P(200, "text/html", index_html, initVarsInHtml);
    });

	server.on("/logout", HTTP_GET, [](AsyncWebServerRequest *request){
		request->send(401,  "text/html", TxtFromMem_P(
						"<html><p>LOGIN PAGE</p><script>setTimeout(function(){ window.open('/','_self'); }, 200);</script></html>"
						));
	});	
    /*---------*/
  } /*STA*/

  if (aWIFIMODE == AP) {
    server.on("/", HTTP_GET, [](AsyncWebServerRequest * request) {
      AsyncWebServerResponse * response = request->beginResponse_P(200, "text/html", safemode_min_html_gz, safemode_min_html_gz_len);
      response->addHeader("Content-Encoding", "gzip");
      request->send(response);
      //request->send_P(200, "text/html", safemod_html, initVarsInHtml);
    });
    /*-------*/
    server.on("/set", HTTP_POST, [](AsyncWebServerRequest * request) {
      uint8_t param_count = request->params();
      String message;
      if (param_count) {
        String _SSID, _SSPSK, _WEBPASS;
        if ((request->hasParam("SSID", true)) && (request->hasParam("SSPSK", true)) && (request->hasParam("WEBPASS", true))) {
          _SSID  = request->getParam("SSID", true)->value();
          _SSPSK = request->getParam("SSPSK", true)->value();
          _WEBPASS = request->getParam("WEBPASS", true)->value();
		  #ifdef DEBUG
          Serial.print(F("New SSID: ")); Serial.print(_SSID);
          Serial.print(F(", SSPSK: ")); Serial.print(_SSPSK);
          Serial.print(F(", WEBPASS: ")); Serial.println(_WEBPASS);
		  #endif
          if ((_SSID != "") && (_SSPSK != "")) {
            message = TxtFromMem_P("<h1>OK. Reboot..</h1>");
            strlcpy(SETTINGS.STASSID, _SSID.c_str(), sizeof(SETTINGS.STASSID));
            strlcpy(SETTINGS.STAPSK,  _SSPSK.c_str(), sizeof(SETTINGS.STAPSK));
            strlcpy(SETTINGS.WEBPASSWORD,  _WEBPASS.c_str(), sizeof(SETTINGS.WEBPASSWORD));
            SETTINGS.SYS_MODE = (uint8_t) STA;
            settingsSAVE();
            delay(500);
          } else {
            message = TxtFromMem_P(PSTR("Invalid Input")); //message = "Invalid Input";
          }
          AsyncWebServerResponse * response = request->beginResponse(200, "text/plain", message);
          response->addHeader("Connection", "close");
          request->send(response);
          ESP.restart();
        } //end.// required heating & temp

      }
      message = TxtFromMem_P(PSTR("No input"));
      AsyncWebServerResponse * response = request->beginResponse(200, "text/plain", message);
      response->addHeader("Connection", "close");
      request->send(response);
    });
    /*---------*/
    server.on("/update", HTTP_POST, [](AsyncWebServerRequest * request) {
      AsyncWebServerResponse * response = request->beginResponse(200, "text/plain", "OK");
      response->addHeader("Connection", "close");
      request->send(response);
      ESP.restart();
    }, handle_update_progress_cb);
    /*---------*/
  } // onAP


  server.onNotFound(notFound);

  // Start server
  server.begin();
  #ifndef DEBUG
  Serial.begin(SETTINGS.COMSPEED);
  #endif
  yield();
}
/*-----------------------------------------------------------------*/
void checkRST() {
  if (REQUIRE_RESET_SYSTEM == true) {
	#ifdef DEBUG
    Serial.print(F("ESP Restart.."));
	#endif
    ESP.restart();
    yield();
  }
}
/*-----------------------------------------------------------------*/
void webLoop() {	
  cMs = millis();
  ws.cleanupClients();
  //ws.pingAll();
  sendUpdate();
  checkRouterLive();
  yield();
  checkRST();
  MDNS.update();
}
/*-----------------------------------------------------------------*/
void loop() {
  mainLoopVSP();
}
/*-----------------------------------------------------------------*/
void led() {
	static byte LEDST = 0;
  static uint32_t lstLED = 0;
	uint32_t _interval = 0;
 
	switch(stLED) {
		case LEDOFF:
			digitalWrite(PIN_LED,1);
			LEDST = 0;
			return;
		break;
		case LEDON:
			digitalWrite(PIN_LED,0);
			LEDST = 1;
			return;
		break;
		case LED_PULSESLOW:
			_interval = 1000UL;
		break;
		case LED_PULSEFAST:
			_interval = 100UL;
		break;
	} //end.sw

	if ((millis()-lstLED)>=_interval) {
		lstLED = millis();
		LEDST = !LEDST;
		digitalWrite(PIN_LED, LEDST);
	}
}
/*-----------------------------------------------------------------*/
byte checkSequence(byte b) {
  static byte buff[3] = {0, 0, 0};
  byte res = 0;

  for (uint8_t i = 0; i < 2; i++) {
    buff[i] = buff[i + 1];
  }
  buff[2] = b;

  if ((buff[0] == 'D') && (buff[1] == 'F') && (buff[2] == 'U')) res = 1;
  return res;
}
/*-----------------------------------------------------------------*/
void TargetRST(byte mode = 0) {
	static uint32_t lstPulseRST = 0;
	static byte _target_rst_st = 0;
	switch(mode) {
		case 0:
			if (_target_rst_st == 0) {
				_target_rst_st = 1; // keep High for stop RST-Target
				digitalWrite(RST_PIN, _target_rst_st);
			}		
		break;
		
		case 1:
			if ((millis()-lstPulseRST)>=50UL) {
				lstPulseRST = millis();
				_target_rst_st = !_target_rst_st;
				digitalWrite(RST_PIN, _target_rst_st);
			}
		break;
	}//end sw
}
/*-----------------------------------------------------------------*/
void mainLoopVSP() {
  WiFiClient clientVSP = serverVSP->available();
  if ((clientVSP) && (aWIFIMODE == STA)) {
	if (!LIVE.DFU_MODE) stLED = LED_PULSEFAST;
	clientVSP.flush();
    lastActivityTime = millis();
    while (clientVSP.connected()) {
	   LIVE.VPS_CONNECTED = 1;
      if (clientVSP.available()) {
        byte clRead = clientVSP.read();

        if ((LIVE.DFU_MODE) && ((millis() - lstRSTinit) >= 500UL)) {
          digitalWrite(RST_PIN, 1); // DFU OFF
          LIVE.DFU_MODE = 0;
		  stLED = LED_PULSEFAST;
		  DFU_IN_PROGRESS = 1;
        }
		
        if ((checkSequence(clRead) == 1) || (LIVE.DFU_MODE)) {
          digitalWrite(RST_PIN, 0); // DFU ON
          lstRSTinit = millis();
          clientVSP.print(F("DFU (reset) Enabled\n"));
		  stLED = LEDON;
        }

        Serial.write(clRead);
        lastActivityTime = millis();
      }
	  if (LIVE.DFU_MODE) TargetRST(1); else TargetRST(0);
	  yield();
      if (Serial.available()) {
        clientVSP.write(Serial.read());
        lastActivityTime = millis();
      }
	  
	  if ((millis() - lastActivityTime) >= 1000UL)  DFU_IN_PROGRESS = 0;
      if ((millis() - lastActivityTime) >= (uint32_t)PORTCLOSE_AFTER) {
        clientVSP.stop();
        break;
      }
	  if (!DFU_IN_PROGRESS) webLoop();
	  led();
    }
	
	DFU_IN_PROGRESS = 0;
	LIVE.VPS_CONNECTED = 0;
	if (LIVE.DFU_MODE) TargetRST(1); else TargetRST(0);
	if (!DFU_IN_PROGRESS) webLoop();
	led();
  }
  
  if (LIVE.DFU_MODE) TargetRST(1); else TargetRST(0);
  if (!DFU_IN_PROGRESS) webLoop();
  if (!LIVE.DFU_MODE) stLED = LED_PULSESLOW;
  led();
}
/*-----------------------------------------------------------------*/
/*
.as<int>()				int32_t
.as<unsigned int>()		uint32_t
.as<long>()				int32_t
.as<unsigned long>()	uint32_t
.as<short>()			int16_t
.as<unsigned short>()	uint16_t
.as<float>()			float
.as<double>()			double
.as<bool>()				bool
.as<const char*>()		const char*
.as<String>()			String
.as<JsonArray>()		JsonArray
.as<JsonObject>()		JsonObject
.as<JsonVariant>()		JsonVariant
*/
