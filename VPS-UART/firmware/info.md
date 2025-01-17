## For ESP12x, ESP8266 
# First install
Binary tools for upload: use Flash Download Tool >= v3.8.5  
https://www.espressif.com/en/tools-type/flash-download-tools  

If you use schematic on this repo, you must powering from 5V line before LDO3.3.
Warning: RST is for TARGET device, not ESP. No need to use RST if enabling ESP to flash and powering.

# For updating (only)
The device must run in SAFEMODE. In this mode, the device creates an AP in the wireless list. The name of the AP is "UPX-VPS-GATEWAY." Connect to it, and you are ready for updating.  
After the update, return to the local network. The device will be accessible at http://upx-vsp.local/. If the page doesn’t display, try toggling Wi-Fi on your laptop or mobile device.

