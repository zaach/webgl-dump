
const CAPTURE_FRAMERATE = 60;
let capturer;
let isCapturing = false;

function startCapture() {
  capturer = new CCapture({
    format: 'webm',
    verbose: true,
    timeLimit: 6,
    framerate: CAPTURE_FRAMERATE,
    //motionBlurFrames: 20,
  });

  //if (videoPreview) {
    //videoPreview.pause();
    //videoPreview.currentTime = 0;
  //}
  isCapturing = true;
  capturer.start();
}

function stopCapture() {
  capturer.stop();
  isCapturing = false;
}

function saveCapture() {
  capturer.save();
}

function saveCaptureMp4() {
  capturer.save(function( blob ) {
    convertStreams(blob, function (result) {
      const url = URL.createObjectURL(result);
      saver(url, true, 'video.mp4');
    });
  });
}

// from ccapture source
function saver(url, winMode, name) {
  let a = document.createElement('a');
  if ('download' in a) {
    a.href = url;
    a.setAttribute("download", name);
    a.innerHTML = "downloading...";
    a.style.display = 'none';
    document.body.appendChild(a);
    setTimeout(function() {
      a.click();
      document.body.removeChild(a);
      if(winMode===true){
        setTimeout(function(){ URL.revokeObjectURL(a.href);}, 250 );
      }
    }, 66);
    return true;
  }

  //do iframe dataURL download (old ch+FF):
  var f = document.createElement("iframe");
  document.body.appendChild(f);
  if(!winMode){ // force a mime that will download:
    url="data:"+url.replace(/^data:([\w\/\-\+]+)/, u);
  }

  f.src = url;
  setTimeout(function(){ document.body.removeChild(f); }, 333);
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function initGL({
    canvas = document.querySelector('#glcanvas'),
    initProgram,
    drawScene,
    width,
    height,
    capture = false,
  }) {

  // Create a capturer that exports a WebM video

  canvas.width = width || window.innerWidth;
  canvas.height = height || window.innerHeight;

  window.addEventListener('resize', function () {
    canvas.width = width || window.innerWidth;
    canvas.height = height || window.innerHeight;
  })

  const gl = canvas.getContext('webgl');

  // If we don't have a GL context, give up now

  if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }

  const program = initProgram(gl);

  // if delta gets screwed up because of a new "now" when capture
  // starts use this delta instead
  const subDelta = 1 / CAPTURE_FRAMERATE;

  var then = 0;
  // Draw the scene repeatedly
  function render(now) {
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;

    // Draw the scene
    drawScene(gl, program.programInfo, program.buffers, deltaTime < 0 ? subDelta : deltaTime);

    requestAnimationFrame(render);
    //console.log('now', deltaTime, now)
    if (capturer) {
      capturer.capture(canvas);
    }
    //if (isCapturing && videoPreview) {
      //videoPreview.currentTime += deltaTime < 0 ? subDelta : deltaTime;
    //}
  }
  requestAnimationFrame(render);

  return gl;
}

//
// Initialize a texture and load an image.
// When the image finished loading copy it into the texture.
//
function loadTexture(gl, url, cb) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Because images have to be download over the internet
  // they might take a moment until they are ready.
  // Until then put a single pixel in the texture so we can
  // use it immediately. When the image has finished downloading
  // we'll update the texture with the contents of the image.
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                pixel);

  const image = new Image();
  image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  srcFormat, srcType, image);

    // WebGL1 has different requirements for power of 2 images
    // vs non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
       // Yes, it's a power of 2. Generate mips.
       gl.generateMipmap(gl.TEXTURE_2D);
    } else {
       // No, it's not a power of 2. Turn of mips and set
       // wrapping to clamp to edge
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    if (cb) cb(image);
  };
  image.src = url;

  return texture;
}

function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

function createAndSetupTexture(gl) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set up texture so we can render any size image and so we are
  // working with pixels.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  return texture;
}

var recordVideo;
var videoPreview = document.getElementById('video-preview');
let videoReady = false;
let videoInit = false;
let animationFrames = [];

function selectFrame(frames, rate, time) {
  const duration = frames.length / rate;
  //console.log('FRAME??', rate, frames.length, time, duration, Math.floor(rate * (time % duration)))
  return frames[Math.floor(rate * (time % duration))];
}

function setupWebcam() {
document.querySelector('#record-video').onclick = function() {
    this.disabled = true;
    navigator.getUserMedia({
            video: true
        }, function(stream) {
            videoPreview.src = URL.createObjectURL(stream);
            //videoPreview.srcObject = stream;
            videoPreview.play();

            recordVideo = RecordRTC(stream, {
                type: 'video'
            });

            recordVideo.startRecording();
        }, function(error) { throw error;});
    document.querySelector('#stop-recording-video').disabled = false;
};

document.querySelector('#stop-recording-video').onclick = function() {
    this.disabled = true;

    recordVideo.stopRecording(function(url) {
        console.log('URLLL', url)
        videoPreview.src = url;
        videoPreview.download = 'video.webm';
        videoPreview.addEventListener('playing', function onplay () {
          videoReady = true;
          videoInit = true;
          videoPreview.removeEventListener('playing', onplay)
        })
        videoPreview.play();
        convertToJpeg(recordVideo.getBlob(), (frames) => {
          //const url = URL.createObjectURL(result);
          console.log('we back', frames, videoPreview.duration, frames.length * (1/videoPreview.duration))
          let loaded = 0;
          const images = frames.map(frame => {
            let img = new Image();
            img.onload = () => {
              if(++loaded === frames.length) {
                console.log('IMAGES done', images)
                animationFrames = images;
              }
            }
            img.src = frame
            return img
          });
        });
        //videoReady = true;
    });
};
}

function initVideoTexture(gl) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Because video has to be download over the internet
  // they might take a moment until it's ready so
  // put a single pixel in the texture so we can
  // use it immediately.
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                pixel);

  // Turn off mips and set  wrapping to clamp to edge so it
  // will work regardless of the dimensions of the video.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  return texture;
}

function updateVideoTexture(gl, texture, video) {
  const level = 0;
  const internalFormat = gl.RGBA;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  if (videoInit) {
    videoInit = false;
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  srcFormat, srcType, video);
  } else {
    gl.texSubImage2D(
        gl.TEXTURE_2D, 0, 0, 0, gl.RGBA,
        gl.UNSIGNED_BYTE, video);
  }
}

function fetchImage(url, cb) {
  let xhr = new XMLHttpRequest()
  xhr.open('GET', url, true)
  xhr.responseType = 'arraybuffer'

  let promise = new Promise((resolve, reject) => {
    xhr.onload = function (e) { resolve(this.response) }
  })
  xhr.send()
  return promise
}

let loadedGif = null
function loadGif(url) {
  fetchImage(url)
  .then(data => deconstructGif(data))
  .then(result => {
    videoInit = true;
    loadedGif = result
  })
}

function rectanglePositions(x, y, width, height) {
  var x1 = x;
  var x2 = x + width;
  var y1 = y;
  var y2 = y + height;
  return [
     x1, y1,
     x2, y1,
     x1, y2,
     x1, y2,
     x2, y1,
     x2, y2,
  ];
}

