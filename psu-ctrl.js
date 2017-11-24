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

function PSUStatus(status) {
	this.status = status;
}

PSUStatus.prototype.setStatus = function(status) {
	this.status = status[0]; // only use the first byte
};

PSUStatus.prototype.isOut = function() {

	// bei OUT1 = ein -> status=A (00001010)
this.status = 0x0A;
	console.log('status: ' + this.status );
	var bit0Set = !!(this.status & 0x01);
	var bit1Set = !!(this.status & 0x02);
	var bit2Set = !!(this.status & 0x04);
	var bit3Set = !!(this.status & 0x08);
	var bit4Set = !!(this.status & 0x10);
	var bit5Set = !!(this.status & 0x20);
	var bit6Set = !!(this.status & 0x40);
	var bit7Set = !!(this.status & 0x80);
	console.log('bit0Set: ' + bit0Set );
	console.log('bit1Set: ' + bit1Set );
	console.log('bit2Set: ' + bit2Set );
	console.log('bit3Set: ' + bit3Set );
	console.log('bit4Set: ' + bit4Set );
	console.log('bit5Set: ' + bit5Set );
	console.log('bit6Set: ' + bit6Set );
	console.log('bit7Set: ' + bit7Set );






    return bit6Set ;
};

var IDN = '';
var ISET1 = '';
var VSET1 = '';
var IOUT1 = '';
var VOUT1 = '';
var STATUS = new PSUStatus(0);


var update = function() {

    sendCmd('ISET1?', function(cmd, result) {
        console.log(cmd + ' -> ' + result);
        ISET1 = result.toString('utf8')
    });
    sendCmd('VSET1?', function(cmd, result) {
        console.log(cmd + ' -> ' + result);
        VSET1 = result.toString('utf8')
    });
    sendCmd('IOUT1?', function(cmd, result) {
        console.log(cmd + ' -> ' + result);
        IOUT1 = result.toString('utf8')
    });
    sendCmd('VOUT1?', function(cmd, result) {
        console.log(cmd + ' -> ' + result);
        VOUT1 = result.toString('utf8')
    });
    sendCmd('STATUS?', function(cmd, result) { console.log(cmd + ' -> ' + result);
        STATUS.setStatus(result);
        console.log('STATUS = ' + STATUS.isOut() );
         }); // TODO evaluate the bits in the result-byte

    setTimeout(update, 1000);
}


serial_port.on('open', function() {
    console.log('on_open()');
    sendCmd('*IDN?', function(cmd, result) {
        console.log(cmd + ' -> ' + result);
        IDN = result.toString('utf8')
    });
    sendCmd('ISET1?', function(cmd, result) {
        console.log(cmd + ' -> ' + result);
        ISET1 = result.toString('utf8')
    });
    sendCmd('VSET1?', function(cmd, result) {
        console.log(cmd + ' -> ' + result);
        VSET1 = result.toString('utf8')
    });
    sendCmd('IOUT1?', function(cmd, result) {
        console.log(cmd + ' -> ' + result);
        IOUT1 = result.toString('utf8')
    });
    sendCmd('VOUT1?', function(cmd, result) {
        console.log(cmd + ' -> ' + result);
        VOUT1 = result.toString('utf8')
    });
    sendCmd('STATUS?', function(cmd, result) { console.log(cmd + ' -> ' + result); }); // TODO evaluate the bits in the result-byte

    setTimeout(update, 1000);
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










function psu_send_cmd(cmd) {
    console.log('psu_send_cmd( ' + cmd + ' )');
    exec("echo -n " + cmd + " > /dev/ttyACM0", (error, stdout, stderr) => {
        //console.log('Ok');
    })
}

function psu_switch_on() {
    psu_send_cmd('OUT1');
}

function psu_switch_off() {
    psu_send_cmd('OUT0');
}

http.createServer(function(request, response) {

    var uri = url.parse(request.url).pathname,
        filename = path.join(process.cwd(), uri),
        html_content = '',
        html_message = '';
    console.log('uri: ' + uri);

    const html_head = "<html><head><title>PSU-Control</title></head><body><h1>" + IDN + "</h1>";
    var html_buttons = "<br/><br/><br/><div>";
    html_buttons += "<button style='font-size: large;' onclick=\"window.location.href='/on'\">ON</button>&nbsp;&nbsp;&nbsp;&nbsp;";
    html_buttons += "<button style='font-size: large;' onclick=\"window.location.href='/off'\">OFF</button>";
    html_buttons += "</div><br/><br/><br/>";
    html_status = '<table>';
    html_status += '<tr><td>IDN</td><td>' + IDN + '</td></tr>';
    html_status += '<tr><td>ISET1</td><td>' + ISET1 + '</td></tr>';
    html_status += '<tr><td>VSET1</td><td>' + VSET1 + '</td></tr>';
    html_status += '<tr><td>IOUT1</td><td>' + IOUT1 + '</td></tr>';
    html_status += '<tr><td>VOUT1</td><td>' + VOUT1 + '</td></tr>';
    html_status += '</table>';

    const html_foot = "</body></html>";

    if (!fs.existsSync(tty_dev)) {
        html_message = '<div style="color: red;">PSU not connected (' + tty_dev + ' not found)</div>';
    } else {
        html_content = "<h1><a href='/on'>ON</a>&nbsp;&nbsp;&nbsp;<a href='/off'>OFF</a></h1>";
        if (uri.toLowerCase() === '/on') {
            psu_switch_on();
        } else if (uri.toLowerCase() === '/off') {
            psu_switch_off();
        }
    }
    response.writeHead(200, { "Content-Type": "text/html" });
    response.write(html_head + html_buttons + html_message + html_status + html_foot);
    response.end();
}).listen(parseInt(port, 10));

console.log("PSU-Control running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
