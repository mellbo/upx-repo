WARNING: WORK IN PROGRESS! DO NOT USE!
# Output pins
LED  = GPIO2  
LocalIP: DHCP  
WebPage: http://upx-smart.local/  
IP for AP (safemode): 192.168.1.1/24  

# Application must be installed  VSP (virtual serial port over WIFI):
  Tibbo Device Server Toolkit   
  https://tibbo.com/support/downloads/tdst.html
  
`[tvsp-setup]`
- TransportProvider=TDI
- TransportProtocol=TCP
- RoutingMode=Client
- ConnectMode=Immediatly
- OnFly=Disabled
- DsrMode=Intially on
- CtsMode=Intially on
- DcdMode=Intially on
- LocalDataPort=1001
- ConnectionTimeout=5
- RemoteNodeType=1
- DestinationIp=255.255.255.255
- DestinationEthernet=0.0.0.0.0.0
- DestinationHostName=upx-vsp.local
- RemoteDataPort=1001  

`More info (photo) in VPS-UART/TibboVPS/Settings`
