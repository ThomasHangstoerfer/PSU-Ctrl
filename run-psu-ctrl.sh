#!/bin/sh

# configure serial port
stty -F /dev/ttyACM0 1:0:800008bd:0:3:1c:7f:15:4:5:1:0:11:13:1a:0:12:f:17:16:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0

while ( true); do
	/usr/bin/nodejs psu-ctrl.js
	sleep 2
done
