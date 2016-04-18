# hex-bot
A sample Facebook Messenger Bot written as an AWS Lambda function.



##Howto

###Step 1.  Creating a Lambda function

(This assumes you already have an AWS account).

1. Log in to your AWS management console and go to Services > Compute > Lambda.
2. Create a new Lambda function (using the `Hello World` node.js blueprint).
3. Set up the basic details of your new function. eg,
  1. Name the function `hexBot`.
  2. Description `A hex code bot for Facebook Messenger`.
  3. Node version `4.3`.
  4. Set the Role to`Basic lambda execution` (make sure your browser allows popup windows).
4. Replce the blueprint code for the function with the following...

```node
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
```

###Step 2. Creating your bots API.

1. Add an API Gateway API endpoint
  1. Api name = `HexBot`, method = `GET`, resource =`/webhook`, security = `OPEN` (for now).
  2. Api name = `HexBot`, method = `POST`, resource =`/webhook`, security = `OPEN` (for now).
2. Go to API Gateway management.
3. Select the /webhook resource `GET` request
  1. Select Method Request and add 2 Query String parameters `hub.verify_token` & `hub.challenge`
  2. Select Integration Request and add a Body Mapping Template `application/json` with the following template:

```node
#set($allParams = $input.params())
{
"params" : {
#foreach($type in $allParams.keySet())
    #set($params = $allParams.get($type))
"$type" : {
    #foreach($paramName in $params.keySet())
    "$paramName" : "$params.get($paramName)"
        #if($foreach.hasNext),#end
    #end
}
    #if($foreach.hasNext),#end
#end
}
}
```

  3.  Select Method Response and add a Response Header `Content-Type`.
  4. Select Integration Response and set the `Content-Type` Header Mapping with a value `‘text/html’` (note, single quotes are important) and a Body Mapping template `text/html` with the following template:

`$input.path('$')`

4. Select the /webhook resource POST request
  1. Select Integration Request and add a Body Mapping Template `application/json` with the following template:

```node
#set($allParams = $input.params())
{
  "body": $input.json('$'),
  "params": {
#foreach($type in $allParams.keySet())
    #set($params = $allParams.get($type))
    "$type": {
    #foreach($paramName in $params.keySet())
      "$paramName": "$util.escapeJavaScript($params.get($paramName))"
        #if($foreach.hasNext),#end
    #end
    }
    #if($foreach.hasNext),#end
#end
  }
}
```

5. Select Actions > Deploy the API. Make a note of the resource url for later.



##Step 3. Creating your Bots Facebook application and page.

1. Create a new, Basic Facebook App.
2. Create a new Facebook (`Brand or Product` > `App page`) Page (https://www.facebook.com/pages/create). The page name and profile pic will be used to form the identity of the bot.
3. Go to your app settings and, under Product Settings, click `Add Product`. Select `Messenger`.
4. Select set up webhooks.
5. Enter the Callback Url of the AWS Lambda resource you created earlier.
6. Enter a verification token string e.g., `mmm_bot_dippy_do_dah_boo_bot`.
7. Select `message_deliveries`, `messages`, `messaging_optins`, and `messaging_postbacks` under *Subscription Fields*.
8. Verify and save the webhook.
9. Generate a page token by the Hex Bot page you just created.  Copy the page access token.
10. Using the Page Access Token generated in the previous step, make the following call. This will subscribe the new app to get updates for the new Page.

`curl -ik -X POST "https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=<token>"`

10. Go back and edit your Lambda Function. Paste the newly generated Page Access Token into the code to replace the existing value of the `token` variable.


###You’re done!
- Visit the new Facebook Page and message Hex Bot to see the automated response!
