function mainGif() {
  const GIF_URL = 'assets/dave.gif';
  fetchImage(GIF_URL)
    .then(data => {
      return deconstructGif(data);
    })
    .then(result => {
      runCompleteGif(result, document.querySelector('#glcanvas'))
    })
}

function deconstructGif(data) {
  const canvas = document.createElement('canvas')
  const gif = decodeGif(data)
  return getCompleteFrames(gif, canvas)
}

function decodeGif(data) {
  const reader = new GifReader(new Uint8Array(data))
  const frames = decodeFrames(reader)

  return {
    reader,
    frames,
  }
}

function decodeFrames(reader) {
  let frames = []
  let count = reader.numFrames()
  for (let i = 0; i < count; i++) {
    frameInfo = reader.frameInfo(i)
    frameInfo.pixels = new Uint8ClampedArray(reader.width * reader.height * 4)
    reader.decodeAndBlitFrameRGBA(i, frameInfo.pixels)
    frames.push(frameInfo)
  }

  return frames
}

function createBufferCanvas(frame, width, height) {
  //Create empty buffer
  const bufferCanvas        = document.createElement('canvas')
  const bufferContext       = bufferCanvas.getContext('2d')
  bufferCanvas.width  = frame.width
  bufferCanvas.height = frame.height

  //Create image date from pixels
  const imageData = bufferContext.createImageData(width, height)
  imageData.data.set(frame.pixels)

  //Fill canvas with image data
  bufferContext.putImageData(imageData, -frame.x, -frame.y)
  return bufferCanvas
}

function getCompleteFrames({ reader, frames }, canvas) {
  const { width, height } = reader
  canvas.width = width
  canvas.height = height
  const DELAY = 1000
  let duration = 0

  const ctx = canvas.getContext('2d')
  let disposeFrame

  const completeFrames = []

  function onFrame(frame, i) {
    duration += frame.delay
    frame.buffer = createBufferCanvas(frame, width, height)

    disposeFrame && disposeFrame()

    switch(frame.disposal) {
      case 2 :
        disposeFrame = () => ctx.clearRect(0, 0, width, height)
        break
      case 3 :
        saved = ctx.getImageData(0, 0, width, height)
        disposeFrame = () => ctx.putImageData(saved, 0, 0)
        break
      default :
        disposeFrame = null
    }
    ctx.drawImage(frame.buffer, frame.x, frame.y)
    completeFrames[i] = ctx.getImageData(0, 0, width, height)
  }

  let promise = new Promise((resolve, reject) => {
    let current = 0
    function loop() {
      onFrame(frames[current], current++)
      if (current < frames.length) {
        requestAnimationFrame(loop)
      } else {
        resolve({
          reader,
          frames,
          duration: duration / 100,
          loopCount: reader.loopCount(),
          completeFrames,
        })
      }
    }
    requestAnimationFrame(loop)
  })

  return promise
}

function toggleBounce() {
  bounce = !bounce;
}

function toggleDirection() {
  isBackward = isBackward ? 0 : 1;
}

function changeSpeed(val) {
  speed *= val
}

let recordingGif = null
function record() {
  recordingGif = new GIF({
    workers: 2,
    quality: 10,
    debug: true,
    workerScript: 'vendor/gif.worker.js',
  });
}
function stopRecording() {
  let gif = recordingGif;
  recordingGif = null

  gif.on('finished', function(blob) {
    console.log('GIF RECORDED', blob)
    //window.open(URL.createObjectURL(blob));
    saver(URL.createObjectURL(blob), null, 'new.gif');
  });
  gif.render();
}

let bounce = false
// 0 = forward, 1 = backward
let isBackward = 0
let speed = 1
function runCompleteGif({ reader, frames, completeFrames, loopCount }, canvas) {
  const { width, height } = reader
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')

  function onFrame(frame, imageData, i) {
    ctx.clearRect(0, 0, width, height)
    ctx.putImageData(imageData, -frame.x, -frame.y)
    if (recordingGif) recordingGif.addFrame(imageData, { delay: frame.delay * speed * 10 })
  }

  let promise = new Promise((resolve, reject) => {
    let tick = 0
    function loop() {
      const selected = (tick < 0 ? ((frames.length - 1)) : 0) + tick % frames.length

      console.log('SELECTED?', selected, isBackward, tick)
      setTimeout(function () {
        onFrame(frames[selected], completeFrames[selected], tick)
        if (bounce && selected === 0 && isBackward) toggleDirection()
        else if (bounce && selected === frames.length -1 && !isBackward) toggleDirection()
        tick += isBackward ? -1 : 1
        loop()
      }, frames[selected].delay * 10 * speed)
    }
    loop()
  })

  return promise
}

