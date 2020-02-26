import { Recorder } from './recorder.js';


let div = document.getElementById('content');
// div.innerText = '您好Recorder';

let audio = document.querySelector('audio');

let config = {
    sampleRate: 16000
};

let recorder;

let startBtn = document.getElementById('start');
startBtn.addEventListener('click', function(e) {
    recorder.record();
    alert('开始录音');
});


let stoptBtn = document.getElementById('stop');
stoptBtn.addEventListener('click', function(e) {
    recorder.stop();
});



function record(rec) {
    recorder = rec;
}
Recorder.createRecorder(record, config);