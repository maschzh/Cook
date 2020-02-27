/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    user = require('./routes/user'),
    http = require('http'),
    path = require('path'),
    ejs = require('ejs');

// let Server = require('ws').Server;
// const wss = new Server({
//     port: 9001
// });

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


// 连接服务器
// wss.on('connection', ws => {
//     console.log('server connected');
//     ws.on('message', data => {
//         console.log('server recived audio blob');

//         // let client = new ApiSpeech(0, appKey, appSecret);
//         // let voice = fs.readFileSync('assets/output.pcm');
//         // // let voiceBase64 = new Buffer(voice);
//         // let voiceBase64 = new Buffer(data);

//         // //识别本地语音文件
//         // client.recognize(voiceBase64, 'pcm', 16000)
//         //     .then((result) => {
//         //         console.log('语音识别本地音频文件结果：' + JSON.stringify(result));
//         //         resTxt = JSON.stringify(result);
//         //     }, (err) => {
//         //         console.log(err);
//         //     });
//     });

//     ws.send(resTxt);

//     ws.on('error', error => {
//         console.log('Error:' + error);

//     });
//     ws.on('close', () => {
//         console.log('Websocket is closed');
//     });
// });


// // 断开连接
// wss.on('disconnection', ws => {
//     ws.on('message', msg => {
//         console.log('server recived msg:' + msg);
//     })
// });

http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});