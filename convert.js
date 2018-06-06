const WORKER_PATH = location.href.replace(location.href.split('/').pop(), '') + '/vendor/ffmpeg_asm.js';

function processInWebWorker() {
    var blob = URL.createObjectURL(new Blob(['importScripts("' + WORKER_PATH + '");var now = Date.now;function print(text) {postMessage({"type" : "stdout","data" : text});};onmessage = function(event) {var message = event.data;if (message.type === "command") {var Module = {print: print,printErr: print,files: message.files || [],arguments: message.arguments || [],TOTAL_MEMORY: message.TOTAL_MEMORY || false};postMessage({"type" : "start","data" : Module.arguments.join(" ")});postMessage({"type" : "stdout","data" : "Received command: " +Module.arguments.join(" ") +((Module.TOTAL_MEMORY) ? ".  Processing with " + Module.TOTAL_MEMORY + " bits." : "")});var time = now();var result = ffmpeg_run(Module);var totalTime = now() - time;postMessage({"type" : "stdout","data" : "Finished processing (took " + totalTime + "ms)"});postMessage({"type" : "done","data" : result,"time" : totalTime});}};postMessage({"type" : "ready"});'], {
        type: 'application/javascript'
    }));

    var worker = new Worker(blob);
    URL.revokeObjectURL(blob);
    return worker;
}

var worker;

function convertStreams(videoBlob, cb) {
    var aab;
    var buffersReady;
    var workerReady;
    var posted;

    var fileReader = new FileReader();
    fileReader.onload = function() {
        aab = this.result;
        postMessage();
    };
    fileReader.readAsArrayBuffer(videoBlob);

    if (!worker) {
        worker = processInWebWorker();
    }

    worker.onmessage = function(event) {
        var message = event.data;
        if (message.type == "ready") {
            console.log('<a href="'+ WORKER_PATH +'" download="ffmpeg-asm.js">ffmpeg-asm.js</a> file has been loaded.');

            workerReady = true;
            if (buffersReady)
                postMessage();
        } else if (message.type == "stdout") {
            console.log(message.data);
        } else if (message.type == "start") {
            console.log('<a href="'+ WORKER_PATH +'" download="ffmpeg-asm.js">ffmpeg-asm.js</a> file received ffmpeg command.');
        } else if (message.type == "done") {
            console.log(JSON.stringify(message));

            var result = message.data[0];
            console.log(JSON.stringify(result));

            var blob = new File([result.data], 'test.mp4', {
                type: 'video/mp4'
            });

            console.log(JSON.stringify(blob));

            cb(blob);
        }
    };
    var postMessage = function() {
        posted = true;

        worker.postMessage({
            type: 'command',
            arguments: '-i video.webm -c:v mpeg4 -b:v 6400k -strict experimental output.mp4'.split(' '),
            TOTAL_MEMORY: 33554432 * 2,
            files: [
                {
                    data: new Uint8Array(aab),
                    name: 'video.webm'
                }
            ]
        });
    };
}

