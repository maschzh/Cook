/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    user = require('./routes/user'),
    http = require('http'),
    path = require('path'),
    ejs = require('ejs'),
    tencentcloud = require('./tencentcloud'),
    tencent = require('./routes/tencentcloud');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.engine('html', ejs.__express);
app.set('view engine', 'html');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

app.all('/*', function(req, res, next) {
    // CORS headers
    res.header("Access-Control-Allow-Origin", "*"); // restrict it to the required domain
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    // Set custom headers for CORS
    res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
    if (req.method == 'OPTIONS') {
        res.status(200).end();
    } else {
        next();
    }
});

app.get('/', routes.index);
app.get('/users', user.list);
app.post('/encrypt', user.encrypt);
app.post('/realtimeAsr', tencent.realtimeAsr);


const Server = require('ws').Server;

const wss = new Server({
    port: 9002
});
const Asr = tencentcloud.asrRealtime;
const Config = tencentcloud.config;


const secretId = 'AKID8BMTnN71d369JKveFTXRtpRBALMwjRCc';
const secretKey = 'xGEZmIUxBquMfqw5AZQCnRpvK7pphmjk';
const appId = 1301364997;

let resTxt;
wss.on('connection', ws => {
    console.log('server connected');
    ws.on('message', data => {
        console.log('server recived audio blob');

        //Config实例的三个参数分别为SecretId, SecretKey, appId。请前往控制台获取后修改下方参数
        let config = new Config(secretId, secretKey, appId);


        //设置接口需要参数，具体请参考 实时语音识别接口文档
        let query = {
                engineModelType: '16k_0',
                resultTextFormat: 0,
                resType: 0,
                voiceFormat: 1,
                cutLength: 50000,
            }
            //创建调用实例
        const asrReq = new Asr(config, query);

        //调用方式1:识别整个文件
        // let filePath = path.resolve('./123.wav');
        // let dataTest = fs.readFileSync(filePath);
        let dataTest = new Buffer(data);

        //发送识别请求，sendVoice函数最后一个参数为文件分片请求返回时触发的回调，可根据业务修改
        //error为请求错误，response为请求响应，data为请求结果
        // asrReq.sendVoice(dataTest, (error, response, data) => {
        //     if (error) {
        //         console.log(error);
        //         return;
        //     }
        //     console.log(data);
        //     resTxt = data; // JSON.stringify(data);
        //     ws.send(resTxt);
        // });

        let vioceId = asrReq.randStr(16);
        let seq = 0;
        let endFlag = 1;

        //发送识别请求，sendRequest函数最后一个参数为请求返回时触发的回调，可根据业务修改
        asrReq.sendRequest(dataTest, vioceId, seq, endFlag, (error, response, data) => {
            if (error) {
                console.log(error);
                return;
            }
            resTxt = data; // JSON.stringify(data);
            console.log(data);
            ws.send(resTxt);
        });

    });
    // let timesRun = 0;

    // let timer = setInterval(function() {
    //     timesRun++;
    //     ws.send(resTxt);
    // }, 1000);

    // setTimeout(function() {
    //     clearInterval(timer);
    // }, 5000)

    ws.on('error', error => {
        console.log('Error:' + error);

    })
    ws.on('close', () => {
        console.log('Websocket is closed');
    });
});

// 断开连接
wss.on('disconnection', ws => {
    ws.on('message', msg => {
        console.log('server recived msg:' + msg);
    })
})

http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});