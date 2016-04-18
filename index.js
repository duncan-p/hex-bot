/*
 * Hex Bot Lambda Function
 */
'use strict';

let https = require('https');
var token = '<page access token>';
var hexRex = /#[0-9abcdef]{6}/gi;

exports.handler = (event, context, callback) => {
    var body = event.body,
        query = (event.params && event.params.querystring) || {};
    
    if (query['hub.verify_token'] == 'mmm_bot_dippy_do_dah_doo_bot') {
        callback(null, query['hub.challenge']);
    
    } else if (body && body.entry) {
        var messaging_events = body.entry[0].messaging,
            ev,
            sender,
            text;
        for (var i = 0, l = messaging_events.length; i < l; i++) {
            ev = body.entry[0].messaging[i];
            sender = ev.sender.id;
            if (ev.message && ev.message.text) {
                text = ev.message.text;
                var hexArr = text.match(hexRex);
                if (hexArr.length) {
                    console.log(`HEX ARRAY: ${JSON.stringify(hexArr)}`);
                    sendGenericMessage(sender, hexArr);
                } else {
                    sendTextMessage(sender, text.substring(0, 200));
                }
                continue;
            }
            if (ev.postback) {
                text = JSON.stringify(ev.postback);
                sendTextMessage(sender, "Postback received: "+text.substring(0, 200));
                continue;
            }
        }
        callback(null, {});

    } else {
        callback(null, { event: event, context: context });   
    }
};

function sendMessage(sender, message) {
    var postData = JSON.stringify({
            recipient: { id: sender },
            message: message
        }),
        options = {
            hostname: 'graph.facebook.com',
            port: 443,
            path: '/v2.6/me/messages?access_token='+token,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': postData.length
            }
        };
    console.log(`POST DATA: ${postData}`);
    var req = https.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
        });
        res.on('end', () => {
            console.log('No more data in response.')
        })
    });
    req.on('error', (e) => {
        console.log(`problem with request: ${e.message}`);
    });
    req.write(postData);
    req.end();
}

function sendTextMessage(sender, text) {
    sendMessage(sender, { 
        text: text
    });
}

function sendGenericMessage(sender, hexArr) {
    var elements = [],
        hexcode,
        titles = [
            "Here's how %s looks",
            "and here's %s",
            "and this is %s"
        ];
    hexArr.forEach(function(hex, idx) {
        hexcode = hex.replace('#','');
        elements.push({
            title: (titles[idx] || titles[0]).replace('%s', hex),
            subtitle: hex,
            image_url: "http://placehold.it/300/"+hexcode+"/ffffff?text="+hexcode,
            buttons: [{
                type: "web_url",
                url: "http://placehold.it/300/"+hexcode,
                title: hex
            }],
        });
    });
    sendMessage(sender, {
        attachment: {
            type: "template",
            payload: {
                template_type: "generic",
                elements: elements
            }
        }
    });
}
/* End of Lambda*/
