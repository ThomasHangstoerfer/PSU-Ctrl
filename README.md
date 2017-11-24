# PSU-Ctrl
WebInterface to control a [Korad KD6005P](https://www.reichelt.com/de/de/Laboratory-Power-Supplies/KD6005P/3/index.html?ACTION=3&GROUPID=4952&ARTICLE=148151) power supply unit.

Setup:
* Raspberry Pi 3
* nodejs (v9.2.0)
* Korad KD6005P
* USB connection RaspPi <-> KD6005P (/dev/ttyACM0)

To start PSU-Ctrl on system-boot, simply run 'run-psu-ctrl.sh' in /etc/rc.local.

Then connect with a browser to http://\<ip-address\>:8888.

![KD6005P](https://cdn-reichelt.de/bilder/web/xxl_ws/D400/KD3005_02.png)
