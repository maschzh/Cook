import InlineWorker from 'inline-worker';

export class Recorder {
    config = {
        bufferLen: 4096,
        numChannels: 1, // 默认单声道
        mimeType: 'audio/wav',
        onaudioprocess: null
    };

    recording = false;

    callbacks = {
        getBuffer: [],
        encode: [],
        exportWAV: []
    };

    constructor(source, cfg) {
        Object.assign(this.config, cfg);
        this.context = source.context;
        this.node = (this.context.createScriptProcessor ||
            this.context.createJavaScriptNode).call(this.context,
            this.config.bufferLen, this.config.numChannels,
            this.config.numChannels);

        this.node.onaudioprocess = (e) => {
            if (!this.recording) return;

            let buffer = [];

            for (let channel = 0; channel < this.config.numChannels; channel++) {
                buffer.push(e.inputBuffer.getChannelData(channel));
            }

            //发送给worker
            this.worker.postMessage({
                command: 'record',
                buffer: buffer
            });

            //数据回调
            if (this.config.onaudioprocess) {
                this.config.onaudioprocess(buffer[0]);
            }
        };

        source.connect(this.node);
        this.node.connect(this.context.destination); // this should not be necessary

        let self = {};

        this.worker = new InlineWorker(function() {
            let recLength = 0,
                recBuffers = [],
                sampleRate,
                numChannels;

            self.onmessage = function(e) {
                switch (e.data.command) {
                    case 'init':
                        init(e.data.config);
                        break;
                    case 'record':
                        record(e.data.buffer);
                        break;
                    case 'encode':
                        encode(e.data.buffer, e.data.sampleRate);
                        break;
                    case 'exportWAV':
                        exportWAV(e.data.type);
                        break;
                    case 'getBuffer':
                        getBuffer();
                        break;
                    case 'clear':
                        clear();
                        break;
                }
            };

            function init(config) {
                sampleRate = config.sampleRate;
                numChannels = config.numChannels;
                initBuffers();
            }

            function record(inputBuffer) {
                for (let channel = 0; channel < numChannels; channel++) {
                    recBuffers[channel].push(inputBuffer[channel]);
                }
                recLength += inputBuffer[0].length;
            }

            function encode(inputBuffer, desiredSamplingRate) {
                desiredSamplingRate = desiredSamplingRate || 16000;

                if (desiredSamplingRate != sampleRate) {
                    inputBuffer = interpolateArray(inputBuffer, desiredSamplingRate, sampleRate);
                }

                let buffer = new ArrayBuffer(inputBuffer.length * 2);
                let view = new DataView(buffer);
                floatTo16BitPCM(view, 0, inputBuffer);
                let audioBlob = new Blob([view], { type: '' });
                self.postMessage({ command: 'encode', data: audioBlob });
            }

            /**
             * 导出wav
             * @param type
             * @param desiredSamplingRate 期望的采样率
             */
            function exportWAV(type, desiredSamplingRate) {
                //默认16k
                desiredSamplingRate = desiredSamplingRate || 16000;
                let buffers = [];

                for (let channel = 0; channel < numChannels; channel++) {
                    let buffer = mergeBuffers(recBuffers[channel], recLength);

                    //需要转换采样率
                    if (desiredSamplingRate != sampleRate) {
                        //插值去点
                        buffer = interpolateArray(buffer, desiredSamplingRate, sampleRate);
                    }

                    buffers.push(buffer);
                }
                let interleaved = numChannels === 2 ? interleave(buffers[0], buffers[1]) : buffers[0];
                let dataview = encodeWAV(interleaved, desiredSamplingRate);
                let audioBlob = new Blob([dataview], { type: type });
                self.postMessage({ command: 'exportWAV', data: audioBlob });
            }

            /**
             * 转换采样率
             * @param data
             * @param newSampleRate 目标采样率
             * @param oldSampleRate 原始采样率
             * @returns {any[] Array}
             */
            function interpolateArray(data, newSampleRate, oldSampleRate) {
                let fitCount = Math.round(data.length * (newSampleRate / oldSampleRate));
                let newData = new Array();

                let springFactor = new Number((data.length - 1) / (fitCount - 1));
                newData[0] = data[0]; // for new allocation
                for (let i = 1; i < fitCount - 1; i++) {
                    let tmp = i * springFactor;
                    let before = new Number(Math.floor(tmp)).toFixed();
                    let after = new Number(Math.ceil(tmp)).toFixed();
                    let atPoint = tmp - before;
                    newData[i] = this.linearInterpolate(data[before], data[after], atPoint);
                }

                newData[fitCount - 1] = data[data.length - 1]; // for new allocation
                return newData;
            }

            function linearInterpolate(before, after, atPoint) {
                return before + (after - before) * atPoint;
            }

            function getBuffer() {
                let buffers = [];
                for (let channel = 0; channel < numChannels; channel++) {
                    buffers.push(mergeBuffers(recBuffers[channel], recLength));
                }
                self.postMessage({ command: 'getBuffer', data: buffers });
            }

            function clear() {
                recLength = 0;
                recBuffers = [];
                initBuffers();
            }

            function initBuffers() {
                for (let channel = 0; channel < numChannels; channel++) {
                    recBuffers[channel] = [];
                }
            }

            function mergeBuffers(recBuffers, recLength) {
                let result = new Float32Array(recLength);
                let offset = 0;
                for (let i = 0; i < recBuffers.length; i++) {
                    result.set(recBuffers[i], offset);
                    offset += recBuffers[i].length;
                }
                return result;
            }

            function interleave(inputL, inputR) {
                let length = inputL.length + inputR.length;
                let result = new Float32Array(length);

                let index = 0,
                    inputIndex = 0;

                while (index < length) {
                    result[index++] = inputL[inputIndex];
                    result[index++] = inputR[inputIndex];
                    inputIndex++;
                }
                return result;
            }

            function floatTo16BitPCM(output, offset, input) {
                for (let i = 0; i < input.length; i++, offset += 2) {
                    let s = Math.max(-1, Math.min(1, input[i]));
                    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                }
            }

            function writeString(view, offset, string) {
                for (let i = 0; i < string.length; i++) {
                    view.setUint8(offset + i, string.charCodeAt(i));
                }
            }

            function encodeWAV(samples, sampleRate) {
                let buffer = new ArrayBuffer(44 + samples.length * 2);
                let view = new DataView(buffer);

                /** RIFF identifier */
                writeString(view, 0, 'RIFF');
                /** RIFF chunk length */
                view.setUint32(4, 36 + samples.length * 2, true);
                /** RIFF type */
                writeString(view, 8, 'WAVE');
                /** format chunk identifier */
                writeString(view, 12, 'fmt');
                /** format chunk length */
                view.setUint32(16, 16, true);
                /* sample format (raw) */
                view.setUint16(20, 1, true);
                /* channel count */
                view.setUint16(22, numChannels, true);
                /* sample rate */
                view.setUint32(24, sampleRate, true);
                /* byte rate (sample rate * block align) */
                view.setUint32(28, sampleRate * 4, true);
                /* block align (channel count * bytes per sample) */
                view.setUint16(32, numChannels * 2, true);
                /* bits per sample */
                view.setUint16(34, 16, true);
                /* data chunk identifier */
                writeString(view, 36, 'data');
                /* data chunk length */
                view.setUint32(40, samples.length * 2, true);

                floatTo16BitPCM(view, 44, samples);

                return view;
            }
        }, self);

        this.worker.postMessage({
            command: 'init',
            config: {
                sampleRate: this.context.sampleRate,
                numChannels: this.config.numChannels
            }
        });

        this.worker.onmessage = (e) => {
            let cb = this.callbacks[e.data.command].pop();
            if (typeof cb == 'function') {
                cb(e.data.data);
            }
        };
    }

    record() {
        this.recording = true;
    }

    stop() {
        this.recording = false;
    }

    clear() {
        this.worker.postMessage({ command: 'clear' });
    }

    encode(cb, buffer, sampleRate) {
        cb = cb || this.config.callback;
        if (!cb) {
            throw new Error('Callback not set');
        }

        this.callbacks.getBuffer.push(cb);
        this.worker.postMessage({ command: 'getBuffer' });
    }

    exportWAVAndUpload(url, callback) {
        let _url = url;
        exportWAV(function(blob) {
            let fd = new FormData();
            fd.append('audioData', blob);
            let xhr = new XMLHttpRequest();
            if (callback) {
                xhr.upload.addEventListener('progress', function(e) {
                    callback('uploading', e);
                }, false);

                xhr.addEventListener('load', function(e) {
                    callback('ok', e);
                }, false);

                xhr.addEventListener('error', function(e) {
                    callback('error', e);
                }, false);
                xhr.addEventListener('abort', function(e) {
                    callback('cancel', e);
                }, false);
            }

            xhr.open('POST', url);
            xhr.send(fd);
        });
    }

    exportWAV(cb, mimeType) {
        mimeType = mimeType || this.config.mimeType;
        cb = cb || this.config.callback;
        if (!cb) {
            throw new Error('Callback not set');
        }

        this.callbacks.exportWAV.push(cb);
        this.worker.postMessage({
            command: 'exportWAV',
            type: mimeType
        });
    }

    static forceDownload(blob, filename) {
        let url = (window.URL || window.webkitURL).createObjectURL(blob);
        let link = window.document.createElement('a');
        link.href = url;
        link.download = filename || 'output.wav';
        let click = document.createEvent('Event');
        click.initEvent('click', true, true);
        link.dispatchEvent(click);
    }

    static throwError(message) {
        alert(message);
        throw new function() {
            this.toString = function() {
                return message
            }
        }
    }

    static createRecorder(callback, config) {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        window.URL = window.URL || window.webkitURL;
        navigator.getUserMedia = navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia;

        if (navigator.getUserMedia) {
            navigator.getUserMedia({ audio: true }, function(stream) {
                let audio_context = new window.AudioContext();
                let rec = new Recorder(input, config);
                callback(rec);
            }, function(error) {
                switch (error.code || error.name) {
                    case 'PERMISSION_DENIED':
                    case 'PermisionDeniedError':
                        throwError('用户拒绝提供信息。');
                        break;
                    case 'NOT_SUPPORTED_ERROR':
                    case 'NotSupportedError':
                        throwError('浏览器不支持硬件设备。');
                        break;
                    case 'MANDATORY_UNSATISFIED_ERROR':
                    case 'MandatoryUnsatisfiedError':
                        throwError('无法发现指定的硬件设备。');
                        break;
                    default:
                        throwError('无法打开麦克风。异常信息：' + (error.code || error.name));
                        break;
                }
            });
        } else {
            throwError('当前浏览器不支持录音功能。');
            return;
        }
    }
}

export default Recorder;