
// PSU-Ctrl
// Author: thomas@bitcoder.de




// https://gist.github.com/ryanflorence/701407

// http://brandonlwhite.github.io/sevenSeg.js/
// https://gist.githubusercontent.com/Grezzo/3babdcfffe837a89c31a/raw/a6c27417ccca9cb15b1a715b48864a23fb9a0ee5/7Seg.html

var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    exec = require("child_process").exec,
    SerialPort = require('serialport'),
    port = process.argv[2] || 8888,
    cmd_timeout = 50; // timeout after which the command-response is assumed to be complete


const tty_dev = '/dev/ttyACM0';
var serial_port = new SerialPort(tty_dev, {
    baudRate: 9600
});



function PSUCommand(cmd, callback) {
    this.cmd = cmd;
    this.callback = callback;
}

PSUCommand.prototype.toString = function() {
    return this.cmd;
};


function PSUStatus() {
    this.status = 0;
    this.psu_id = ' - - - ';

    this.modeCh1 = '';
    this.modeCh2 = '';
    this.beepOn = false;
    this.locked = false;
    this.output = false;

    this.Iset = 0.0;
    this.Vset = 0.0;
    this.Iout = 0.0;
    this.Vout = 0.0;

    this.connected = false;
    this.msg = '';
}

PSUStatus.prototype.setStatus = function(status) {
    this.status = status; // only use the first byte

    var bit0Set = !!(this.status & 0x01);
    var bit1Set = !!(this.status & 0x02);
    var bit2Set = !!(this.status & 0x04);
    var bit3Set = !!(this.status & 0x08);
    var bit4Set = !!(this.status & 0x10);
    var bit5Set = !!(this.status & 0x20);
    var bit6Set = !!(this.status & 0x40);
    var bit7Set = !!(this.status & 0x80);

    this.modeCh1 = bit0Set ? 'CV' : 'CC';
    this.modeCh2 = bit1Set ? 'CV' : 'CC';
    this.beepOn = bit4Set;
    this.locked = !bit5Set;
    this.output = bit6Set;
}


var psu_status = new PSUStatus();
psu_status.setStatus(0xA);

var updateAll = function() {

    sendCmd('*IDN?', function(cmd, result) {
        //console.log(cmd + ' -> ' + result);
        psu_status.psu_id = result.toString('utf8');
	psu_status.psu_id = psu_status.psu_id.substr(0, psu_status.psu_id.indexOf('\u0000'));
    });
    sendCmd('ISET1?', function(cmd, result) {
        //console.log(cmd + ' -> ' + result);
        psu_status.Iset = parseFloat(result.toString('utf8')).toFixed(2);
    });
    sendCmd('VSET1?', function(cmd, result) {
        //console.log(cmd + ' -> ' + result);
        psu_status.Vset = parseFloat(result.toString('utf8')).toFixed(2);
    });
    sendCmd('IOUT1?', function(cmd, result) {
        //console.log(cmd + ' -> ' + result);
        psu_status.Iout = parseFloat(result.toString('utf8')).toFixed(2);
    });
    sendCmd('VOUT1?', function(cmd, result) {
        //console.log(cmd + ' -> ' + result);
        psu_status.Vout = parseFloat(result.toString('utf8')).toFixed(2);
    });
    sendCmd('STATUS?', function(cmd, result) {
        //console.log(cmd + ' -> ' + result);
        psu_status.setStatus(parseInt(result[0]));
        //console.log('psu_status.output = ' + psu_status.output );
    });

    setTimeout(updateAll, 1000);
}


serial_port.on('open', function() {
    console.log('on_open()');
    psu_status.connected = true;
    psu_status.msg = '';
    

    setTimeout(updateAll, 1000);
});

serial_port.on('error', function(err) {
    console.log('on_error()' + err);
    psu_status.connected = false;
    psu_status.msg = err.toString();
});


var currentCommand = undefined;

var cmd_queue = [];

function sendCmd(cmd, callback) {
    //console.log('sendCmd(' + cmd + ')');
    var newCmd = new PSUCommand(cmd, callback);
    if (currentCommand == undefined) {
        //console.log('send');
        currentCommand = newCmd;
        serial_port.write(currentCommand.cmd);

    } else {
        //console.log('enqueue');
        cmd_queue.push(newCmd);
    }
}

var timer = undefined;
var receiveBuffer = Buffer.alloc(50, 0);
var receiveBufferOffset = 0;

serial_port.on('data', function(data) {
    //console.log('Data(' + data.length + '): ', data, ' toString(): ' + data.toString('utf8'));
    //buf.copy(target[, targetStart[, sourceStart[, sourceEnd]]])
    data.copy(receiveBuffer, receiveBufferOffset);
    receiveBufferOffset += data.length;

    //console.log('receiveBuffer(' + receiveBuffer.length + '): ', receiveBuffer, ' toString(): ' + receiveBuffer.toString('utf8'));
    if (timer != undefined) {
        clearTimeout(timer);
        timer = undefined;
    }
    timer = setTimeout(function() {
        timer = undefined;
        //console.log('cmd finished: ' + receiveBuffer.toString('utf8'));
        currentCommand.callback(currentCommand, receiveBuffer);
        currentCommand = undefined;
        receiveBuffer.fill(0);
        receiveBufferOffset = 0;

        if (cmd_queue.length > 0) {
            //console.log('send next command from queue');
            var c = cmd_queue.shift();
            sendCmd(c.cmd, c.callback);
        }
    }, cmd_timeout);
});










const srv = http.createServer(function(request, response) {

    var uri_full = url.parse(request.url, true),
        uri = uri_full.pathname,
        doc_root = path.join(process.cwd(), 'web'),
        filename = '',
        html_content = '',
        html_message = '',
	handled = false;
    console.log('uri_full: ', uri_full);

	if (uri_full.search == undefined ) {
		if ( uri === '' || uri === '/' ) {
	        	filename = path.join(doc_root, "index.html");
		}
		else {
			if ( fs.existsSync(path.join(doc_root, uri)) ) {
				filename = path.join(doc_root, uri);
			}
		}
		console.log('filename: ' + filename);

    if ( (fs.existsSync(filename)) ) { // && uri_full.pathname !== '/') 

        console.log('filename: ' + filename);
        if (fs.statSync(filename).isFile()) {
            console.log('filename: ' + filename);
            fs.readFile(filename, "binary", function(err, file) {
                if (err) {
                    console.log('err: ' + err);
                    response.writeHead(500, { "Content-Type": "text/plain" });
                    //response.write(err + "\n");
                    response.end();
                    return;
                }
                response.writeHead(200);
                response.write(file, "binary");
                response.end();
                return;
            });
            return;
        }
    } else {
        console.log(filename + ' does not exist');

    }
}
    console.log('uri_full.query: ', uri_full.query);


    if ( uri_full.query.cmd !== undefined ) {
        console.log('cmd found: ' + uri_full.query.cmd);

        sendCmd(uri_full.query.cmd, function(cmd, result) {
            console.log(cmd + ' -> ' + result);
        });
        handled = true;
        resultString = 'Ok';
    }
    if ( uri_full.query.status !== undefined ) {
        console.log('status request found ');
        handled = true;
        //psu_status.Iout = (Math.random() * 10) + 1;
        //psu_status.Iout = psu_status.Iout.toFixed(2);
        console.log('psu_status.Iout = ' + psu_status.Iout );
        //psu_status.Vout = (Math.random() * 20) + 1;
        //psu_status.Vout = psu_status.Vout.toFixed(2);
        resultString = JSON.stringify(psu_status);
        console.log('resultString: ' + resultString );
    }



    if ( handled ) {
        response.writeHead(200, { "Content-Type": "text/html" });
        response.write(resultString);
        response.end();
    }
    else
    {
        response.writeHead(404, { "Content-Type": "text/html" });
        response.write('Invalid request');
        response.end();
    }
});


srv.on('upgrade', (req, socket, head) => {
    console.log('upgrade');
  socket.write('HTTP/1.1 101 Web Socket Protocol Handshake\r\n' +
               'Upgrade: WebSocket\r\n' +
               'Connection: Upgrade\r\n' +
               '\r\n');

//  socket.pipe(socket); // echo back
});

srv.listen(parseInt(port, 10));


console.log("PSU-Control running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
