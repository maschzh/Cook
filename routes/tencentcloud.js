const tencentcloud = require('../tencentcloud');

exports.realtimeAsr = function(req, res) {
    let param = req.body;
    try {
        let data = _realtimeAsr(param.blob);
        res.json({
            Data: data,
            Error: null
        });
    } catch (error) {
        res.json({
            Data: null,
            Error: error
        });
    }
};

function _realtimeAsr() {
    const Asr = tencentcloud.asrRealtime;
    const Config = tencentcloud.config;


    const secretId = 'AKID8BMTnN71d369JKveFTXRtpRBALMwjRCc';
    const secretKey = 'xGEZmIUxBquMfqw5AZQCnRpvK7pphmjk';
    const appId = 1301364997;

    let returnData;

    // const Asr = tencentcloud.asrRealtime;
    // const Config = tencentcloud.config;


    // const secretId = 'AKID8BMTnN71d369JKveFTXRtpRBALMwjRCc';
    // const secretKey = 'xGEZmIUxBquMfqw5AZQCnRpvK7pphmjk';
    // const appId = 1301364997;


    // let result;
    // //Config实例的三个参数分别为SecretId, SecretKey, appId。请前往控制台获取后修改下方参数
    // let config = new Config(secretId, secretKey, appId);


    // //设置接口需要参数，具体请参考 实时语音识别接口文档
    // let query = {
    //         engineModelType: '16k_0',
    //         resultTextFormat: 0,
    //         resType: 0,
    //         voiceFormat: 1,
    //         cutLength: 50000,
    //     }
    //     //创建调用实例
    // const asrReq = new Asr(config, query);

    // //调用方式1:识别整个文件
    // // let filePath = path.resolve('./123.wav');
    // // let dataTest = fs.readFileSync(filePath);
    // let dataTest = new Buffer(data);

    // //发送识别请求，sendVoice函数最后一个参数为文件分片请求返回时触发的回调，可根据业务修改
    // //error为请求错误，response为请求响应，data为请求结果
    // asrReq.sendVoice(dataTest, (error, response, data) => {
    //     if (error) {
    //         console.log(error);
    //         return;
    //     }
    //     console.log(data);
    //     return data; // JSON.stringify(data);
    // });
}