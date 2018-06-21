//
// Start here
//
//
function mainImage() {
  const gl = initGL({
    initProgram: initProgramImage,
    drawScene: drawSceneImage,
  });
}

let imageLoaded = false;
let imgWidth = 1;
let imgHeight = 1;

function initProgramImage(gl) {
  // Vertex shader program

  const vsSource = `
    #ifdef GL_ES
      precision mediump float;
    #endif

    attribute vec4 aVertexPosition;
    attribute vec2 aTextureCoord;

    uniform vec2 u_resolution;
    uniform vec2 u_textureSize;
    uniform float u_time;

    varying highp vec2 vTextureCoord;

    void main(void) {
      mat3 texture_scale = mat3(
          vec3(1, 0.0, 0.0),
          //vec3(u_textureSize.y/u_textureSize.x, 0.0, 0.0),
          vec3(    0.0, 1.0, 0.0),
          vec3(    0.0, 0.0, 1.0)
      );
      vec4 projectionView = vec4(1, -1, 1, 1);
      mat4 modelView = mat4(texture_scale);
      gl_Position = projectionView * modelView * aVertexPosition;
      vTextureCoord = aTextureCoord;
    }
  `;

  // Fragment shader program

  const fsSource = `
    #ifdef GL_ES
      precision mediump float;
    #endif

    #define PI 3.14159265359

    uniform vec2 u_resolution;
    uniform vec2 u_textureSize;
    uniform float u_time;
    uniform sampler2D uSampler;
    uniform float u_kernel[9];
    uniform float u_kernelWeight;

    varying highp vec2 vTextureCoord;

    float random (vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    mat3 itexture_scale = mat3(
        vec3(u_textureSize.x/u_textureSize.y, 0.0, 0.0),
        vec3(    0.0, 1.0, 0.0),
        vec3(    0.0, 0.0, 1.0)
    );
    mat3 window_scale = mat3(
        vec3(u_resolution.y/u_resolution.x, 0.0, 0.0),
        vec3(    0.0, 1.0, 0.0),
        vec3(    0.0, 0.0, 1.0)
    );

    vec4 getColorSum (vec2 position, float kernel) {
      vec2 onePixel = vec2(1.0, 1.0) / u_resolution;
      return texture2D(uSampler, vTextureCoord + onePixel * position) * kernel;
    }

    vec4 computeColorSum() {
      vec4 sum =
        getColorSum(vec2(-1, -1), u_kernel[0]) +
        getColorSum(vec2( 0, -1), u_kernel[1]) +
        getColorSum(vec2( 1, -1), u_kernel[2]) +
        getColorSum(vec2(-1,  0), u_kernel[3]) +
        getColorSum(vec2( 0,  0), u_kernel[4]) +
        getColorSum(vec2( 1,  0), u_kernel[5]) +
        getColorSum(vec2(-1,  1), u_kernel[6]) +
        getColorSum(vec2( 0,  1), u_kernel[7]) +
        getColorSum(vec2( 1,  1), u_kernel[8]) ;
      return sum;
    }

    void main(void) {
      //highp vec4 texelColor = texture2D(uSampler, vTextureCoord);

      vec4 colorSum = computeColorSum();

      //gl_FragColor = vec4(texelColor.rgb, texelColor.a);
      gl_FragColor = vec4(vec3(colorSum / u_kernelWeight).rgb, 1);
      //gl_FragColor = gl_FragColor.bgra;
    }
  `;

  // Initialize a shader program; this is where all the lighting
  // for the vertices and so forth is established.
  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

  // Collect all the info needed to use the shader program.
  // Look up which attributes our shader program is using
  // for aVertexPosition, aVevrtexColor and also
  // look up uniform locations.
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
    },
    uniformLocations: {
      u_resolution: gl.getUniformLocation(shaderProgram, 'u_resolution'),
      u_time: gl.getUniformLocation(shaderProgram, 'u_time'),
      uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
      u_textureSize: gl.getUniformLocation(shaderProgram, 'u_textureSize'),
      u_kernel: gl.getUniformLocation(shaderProgram, 'u_kernel[0]'),
      u_kernelWeight: gl.getUniformLocation(shaderProgram, 'u_kernelWeight'),
    },
  };

  // Here's where we call the routine that builds all the
  // objects we'll be drawing.
  const buffers = initBuffersImage(gl);

  return {
    programInfo,
    buffers,
  };
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just
// have one object -- a simple two-dimensional square.
//
function initBuffersImage(gl) {

  // Create a buffer for the square's positions.
  const positionBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Now create an array of positions for the square.
  //const positions = [
     //1.0,  1.0,
    //-1.0,  1.0,
     //1.0, -1.0,
    //-1.0, -1.0,
  //];
  const positions = rectanglePositions(-1, -1, 2, 2);
  //const positions = rectanglePositions(0, 0, gl.canvas.width, gl.canvas.height);

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const textureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

  const textureCoordinates =  [
      0.0,  0.0,
      1.0,  0.0,
      0.0,  1.0,
      0.0,  1.0,
      1.0,  0.0,
      1.0,  1.0
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
                gl.STATIC_DRAW);

  const imageTexture = loadTexture(gl, 'assets/image.jpg', (img) => {
    imgWidth = img.width;
    imgHeight = img.height;
    textures.forEach(t => {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(
          gl.TEXTURE_2D, 0, gl.RGBA, img.width, img.height, 0,
          gl.RGBA, gl.UNSIGNED_BYTE, null);
    })
    imageLoaded = true;
    console.log('img', img.width, img.height)
  });

  const textures = [];
  const framebuffers = []

  for (let ii = 0; ii < 2; ++ii) {
    let texture = createAndSetupTexture(gl);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, null);
    textures.push(texture)

    // Create a framebuffer
    let fbo = gl.createFramebuffer();
    framebuffers.push(fbo);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
 
    // Attach a texture to it.
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures[ii], 0);
  }

  return {
    position: positionBuffer,
    textureCoord: textureCoordBuffer,
    imageTexture,
    textures,
    framebuffers,
  };
}

//
// Draw the scene.
//
let sceneTimeImage = 0;
function drawSceneImage(gl, programInfo, buffers, deltaTime, width, height) {
  // Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.disable(gl.DEPTH_TEST);           // Enable depth testing

  //gl.viewport(0,0, width || gl.canvas.clientWidth, height || gl.canvas.clientHeight);

  // Clear the canvas before we start drawing on it.

  gl.clear(gl.COLOR_BUFFER_BIT);

  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute
  {
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexPosition);
  }

  // tell webgl how to pull out the texture coordinates from buffer
  {
    const num = 2; // every coordinate composed of 2 values
    const type = gl.FLOAT; // the data in the buffer is 32 bit float
    const normalize = false; // don't normalize
    const stride = 0; // how many bytes to get from one set to the next
    const offset = 0; // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, num, type, normalize, stride, offset);
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
  }

  const kernel = kernels[selectedKernel];

  // Set the shader uniforms
  gl.uniform2f(
     programInfo.uniformLocations.u_resolution,
     width || gl.canvas.clientWidth, height || gl.canvas.clientHeight);

  gl.uniform1f( programInfo.uniformLocations.u_time, sceneTimeImage);

  gl.uniform2f(
     programInfo.uniformLocations.u_textureSize,
     imgWidth, imgHeight);

    //console.log('kern', kernel, computeKernelWeight(kernel))

  // Tell WebGL we want to affect texture unit 0
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, buffers.imageTexture);

  // Tell the shader we bound the texture to texture unit 0
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

  if (imageLoaded) {
    // loop through each effect we want to apply.
    for (var ii = 0; ii < effectsToApply.length; ++ii) {
      // Setup to draw into one of the framebuffers.
      setFramebuffer(buffers.framebuffers[ii % 2], imgWidth, imgHeight);
      drawWithKernel(effectsToApply[ii]);

      // for the next draw, use the texture we just rendered to.
      gl.bindTexture(gl.TEXTURE_2D, buffers.textures[ii % 2]);
    }

    // finally draw the result to the canvas.
    //gl.uniform1f(flipYLocation, -1);  // need to y flip for canvas
    setFramebuffer(null, gl.canvas.clientWidth, gl.canvas.clientHeight);
    drawWithKernel("normal");
  } else {
    const offset = 0;
    const vertexCount = 6;
    gl.drawArrays(gl.TRIANGLES, offset, vertexCount);
  }

  function setFramebuffer(fbo, width, height) {
    // make this the framebuffer we are rendering to.
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
 
    // Tell the shader the resolution of the framebuffer.
    gl.uniform2f(programInfo.uniformLocations.u_resolution, width, height);
 
    // Tell webgl the viewport setting needed for framebuffer.
    gl.viewport(0, 0, width, height);
  }
 
  function drawWithKernel(name) {
    let kernel = kernels[name]
    // set the kernel
    //gl.uniform1fv(kernelLocation, kernels[name]);

    gl.uniform1fv(programInfo.uniformLocations.u_kernel, kernel);
    gl.uniform1f(programInfo.uniformLocations.u_kernelWeight, computeKernelWeight(kernel));
 
    // Draw the rectangle.
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  sceneTimeImage += deltaTime;
}

let selectedKernel = 'gaussianBlur';

// Define several convolution kernels
var kernels = {
  normal: [
    0, 0, 0,
    0, 1, 0,
    0, 0, 0
  ],
  gaussianBlur: [
    0.045, 0.122, 0.045,
    0.122, 0.332, 0.122,
    0.045, 0.122, 0.045
  ],
  gaussianBlur2: [
    1, 2, 1,
    2, 4, 2,
    1, 2, 1
  ],
  gaussianBlur3: [
    0, 1, 0,
    1, 1, 1,
    0, 1, 0
  ],
  unsharpen: [
    -1, -1, -1,
    -1,  9, -1,
    -1, -1, -1
  ],
  sharpness: [
     0,-1, 0,
    -1, 5,-1,
     0,-1, 0
  ],
  sharpen: [
     -1, -1, -1,
     -1, 16, -1,
     -1, -1, -1
  ],
  edgeDetect: [
     -0.125, -0.125, -0.125,
     -0.125,  1,     -0.125,
     -0.125, -0.125, -0.125
  ],
  edgeDetect2: [
     -1, -1, -1,
     -1,  8, -1,
     -1, -1, -1
  ],
  edgeDetect3: [
     -5, 0, 0,
      0, 0, 0,
      0, 0, 5
  ],
  edgeDetect4: [
     -1, -1, -1,
      0,  0,  0,
      1,  1,  1
  ],
  edgeDetect5: [
     -1, -1, -1,
      2,  2,  2,
     -1, -1, -1
  ],
  edgeDetect6: [
     -5, -5, -5,
     -5, 39, -5,
     -5, -5, -5
  ],
  sobelHorizontal: [
      1,  2,  1,
      0,  0,  0,
     -1, -2, -1
  ],
  sobelVertical: [
      1,  0, -1,
      2,  0, -2,
      1,  0, -1
  ],
  previtHorizontal: [
      1,  1,  1,
      0,  0,  0,
     -1, -1, -1
  ],
  previtVertical: [
      1,  0, -1,
      1,  0, -1,
      1,  0, -1
  ],
  boxBlur: [
      0.111, 0.111, 0.111,
      0.111, 0.111, 0.111,
      0.111, 0.111, 0.111
  ],
  triangleBlur: [
      0.0625, 0.125, 0.0625,
      0.125,  0.25,  0.125,
      0.0625, 0.125, 0.0625
  ],
  emboss: [
     -2, -1,  0,
     -1,  1,  1,
      0,  1,  2
  ]
};

var effectsToApply = [
    //"gaussianBlur",
    //"gaussianBlur",
    //"gaussianBlur",
    //"gaussianBlur",
    "emboss",
    //"gaussianBlur2",
    //"gaussianBlur3",
    //"gaussianBlur",
    //"edgeDetect2"
  ];

function computeKernelWeight(kernel) {
  var weight = kernel.reduce(function(prev, curr) {
      return prev + curr;
    });
    //console.log('WEIGG', weight)
  return weight <= 0 ? 1 : weight;
}
