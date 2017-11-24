// https://gist.github.com/ryanflorence/701407

var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    exec = require("child_process").exec,
    port = process.argv[2] || 8888;
const tty_dev = '/dev/ttyACM0';

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

    const html_head = "<html><head><title>PSU-Control</title></head><body><h1>Korad KD6005P</h1>";
    var html_buttons = "<br/><br/><br/><div>";
    html_buttons += "<button style='font-size: large;' onclick=\"window.location.href='/on'\">ON</button>&nbsp;&nbsp;&nbsp;&nbsp;";
    html_buttons += "<button style='font-size: large;' onclick=\"window.location.href='/off'\">OFF</button>";
    html_buttons += "</div><br/><br/><br/>";
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
    response.write(html_head + html_buttons + html_message + html_foot);
    response.end();
}).listen(parseInt(port, 10));

console.log("PSU-Control running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
