//
// Start here
//
//
function main2d() {
  const gl = initGL({
    instancing: true,
    initProgram: initProgram2d,
    drawScene: drawScene2d,
  });
  loadGif('assets/dave.gif')
}

function initProgram2d(gl) {
  // Vertex shader program

  const vsSource = `
    #ifdef GL_ES
      precision highp float;
    #endif

    attribute vec3 positions;
    attribute vec3 aNormals;
    attribute vec3 instanceOffsets;
    //attribute vec4 instanceColors;
    attribute vec2 instanceIndex;
    attribute vec2 aTextureCoord;

    uniform mat4 uModel;
    uniform mat4 uView;
    uniform mat4 uProjection;
    uniform mat4 uNormal;
    uniform float u_time;
    uniform sampler2D uAnimated;

    varying vec4 vColor;
    varying vec2 vTexCoord;
    varying highp vec3 vLighting;

    void main(void) {
      vec4 texelColor = texture2D(uAnimated, instanceIndex);
      //vColor = instanceColors;
      //vColor = texelColor;
      vColor = texelColor;
      vTexCoord = aTextureCoord;

      // Vertex position (z coordinate undulates with time), and model rotates around center
      float delta = length(instanceOffsets.xy);
      vec4 offset = vec4(instanceOffsets.xy, sin((6.0 * u_time + delta) * 0.1) * 12.0, 0);

      // Apply lighting effect

      highp vec3 ambientLight = vec3(0.1, 0.1, 0.1);
      highp vec3 directionalLightColor = vec3(1, 1, 1);
      highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

      highp vec4 transformedNormal = uNormal * vec4(aNormals, 1.0);

      highp float directional = abs(dot(transformedNormal.xyz, directionalVector));
      vLighting = ambientLight + (directionalLightColor * directional);

      //gl_Position = uProjection * uView * (uModel * vec4(positions, 1.0) + offset);
      gl_Position = uProjection * (uModel * vec4(positions, 1.0) + offset);
    }
  `;

  // Fragment shader program

  const fsSource = `
    #ifdef GL_ES
      precision highp float;
    #endif

    #define PI 3.14159265359

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform sampler2D uAnimated;

    varying vec4 vColor;
    varying vec2 vTexCoord;
    varying highp vec3 vLighting;

    void main(void) {
      //gl_FragColor = vec4(vColor) - vec4(1.0, 0.0, 0.0, 0.0);
      gl_FragColor = vec4(vColor);
      vec4 texelColor = texture2D(uAnimated, vTexCoord);
      //gl_FragColor = vec4(min(gl_FragColor.rgb, texelColor.rgb) * 2., gl_FragColor.a);
      gl_FragColor = vec4(gl_FragColor.rgb * 3. * texelColor.rgb, gl_FragColor.a);
      //gl_FragColor = dirlight_filterColor(gl_FragColor);
      //gl_FragColor = picking_filterColor(gl_FragColor);
      gl_FragColor = gl_FragColor * vec4(vLighting * 2., 1.0);
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
      positions: gl.getAttribLocation(shaderProgram, 'positions'),
      aNormals: gl.getAttribLocation(shaderProgram, 'aNormals'),
      instanceOffsets: gl.getAttribLocation(shaderProgram, 'instanceOffsets'),
      instanceColors: gl.getAttribLocation(shaderProgram, 'instanceColors'),
      instanceIndex: gl.getAttribLocation(shaderProgram, 'instanceIndex'),
      aTextureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
    },
    uniformLocations: {
      uModel: gl.getUniformLocation(shaderProgram, 'uModel'),
      uView: gl.getUniformLocation(shaderProgram, 'uView'),
      uProjection: gl.getUniformLocation(shaderProgram, 'uProjection'),
      uNormal: gl.getUniformLocation(shaderProgram, 'uNormal'),
      uAnimated: gl.getUniformLocation(shaderProgram, 'uAnimated'),
      u_resolution: gl.getUniformLocation(shaderProgram, 'u_resolution'),
      u_time: gl.getUniformLocation(shaderProgram, 'u_time'),
    },
  };

  // Here's where we call the routine that builds all the
  // objects we'll be drawing.
  const buffers = initBuffers2d(gl);

  return {
    programInfo,
    buffers,
  };
}

const SIDE = 256;

function calcNormal(p) {
    var normal = [0, 0, 0];
    for(var i = 0; i < p.length; i++) {
        var j = (i + 1) % (p.length);       
        normal[0] += (p[i][1] - p[j][1]) * (p[i][2] + p[j][2]);
        normal[1] += (p[i][2] - p[j][2]) * (p[i][0] + p[j][0]);
        normal[2] += (p[i][0] - p[j][0]) * (p[i][1] + p[j][1]);
    }
    return normal;
}

function calcNormal2(p, offset = 3) {
    var normal = [0, 0, 0];
    for(var i = 0; i < p.length; i++) {
        var j = (i + offset) % (p.length);       
        normal[0] += (p[i + 1] - p[j + 1]) * (p[i + 2] + p[j + 2]);
        normal[1] += (p[i + 2] - p[j + 2]) * (p[i + 0] + p[j + 0]);
        normal[2] += (p[i + 0] - p[j + 0]) * (p[i + 1] + p[j + 1]);
    }
    return normal;
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just
// have one object -- a simple two-dimensional square.
//
function initBuffers2d(gl) {

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  var positions = new Float32Array(
    [
    -0.5, -0.5,  -0.5,
    -0.5,  0.5,  -0.5,
     0.5, -0.5,  -0.5,
    -0.5,  0.5,  -0.5,
     0.5,  0.5,  -0.5,
     0.5, -0.5,  -0.5,

    -0.5, -0.5,   0.5,
     0.5, -0.5,   0.5,
    -0.5,  0.5,   0.5,
    -0.5,  0.5,   0.5,
     0.5, -0.5,   0.5,
     0.5,  0.5,   0.5,

    -0.5,   0.5, -0.5,
    -0.5,   0.5,  0.5,
     0.5,   0.5, -0.5,
    -0.5,   0.5,  0.5,
     0.5,   0.5,  0.5,
     0.5,   0.5, -0.5,

    -0.5,  -0.5, -0.5,
     0.5,  -0.5, -0.5,
    -0.5,  -0.5,  0.5,
    -0.5,  -0.5,  0.5,
     0.5,  -0.5, -0.5,
     0.5,  -0.5,  0.5,

    -0.5,  -0.5, -0.5,
    -0.5,  -0.5,  0.5,
    -0.5,   0.5, -0.5,
    -0.5,  -0.5,  0.5,
    -0.5,   0.5,  0.5,
    -0.5,   0.5, -0.5,

     0.5,  -0.5, -0.5,
     0.5,   0.5, -0.5,
     0.5,  -0.5,  0.5,
     0.5,  -0.5,  0.5,
     0.5,   0.5, -0.5,
     0.5,   0.5,  0.5,

    ]);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  const vertexNormals = [
    // Front
     0.0,  0.0,  1.0,
     0.0,  0.0,  1.0,
     0.0,  0.0,  1.0,
     0.0,  0.0,  1.0,
     0.0,  0.0,  1.0,
     0.0,  0.0,  1.0,

    // Back
     0.0,  0.0, -1.0,
     0.0,  0.0, -1.0,
     0.0,  0.0, -1.0,
     0.0,  0.0, -1.0,
     0.0,  0.0, -1.0,
     0.0,  0.0, -1.0,

    // Top
     0.0,  1.0,  0.0,
     0.0,  1.0,  0.0,
     0.0,  1.0,  0.0,
     0.0,  1.0,  0.0,
     0.0,  1.0,  0.0,
     0.0,  1.0,  0.0,

    // Bottom
     0.0, -1.0,  0.0,
     0.0, -1.0,  0.0,
     0.0, -1.0,  0.0,
     0.0, -1.0,  0.0,
     0.0, -1.0,  0.0,
     0.0, -1.0,  0.0,

    // Right
     1.0,  0.0,  0.0,
     1.0,  0.0,  0.0,
     1.0,  0.0,  0.0,
     1.0,  0.0,  0.0,
     1.0,  0.0,  0.0,
     1.0,  0.0,  0.0,

    // Left
    -1.0,  0.0,  0.0,
    -1.0,  0.0,  0.0,
    -1.0,  0.0,  0.0,
    -1.0,  0.0,  0.0,
    -1.0,  0.0,  0.0,
    -1.0,  0.0,  0.0,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals),
                gl.STATIC_DRAW);


  const textureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
  let texcoords = [
      0, 0,
      0, 1,
      1, 0,
      0, 1,
      1, 1,
      1, 0,

      0, 0,
      0, 1,
      1, 0,
      1, 0,
      0, 1,
      1, 1,

      0, 0,
      0, 1,
      1, 0,
      0, 1,
      1, 1,
      1, 0,

      0, 0,
      0, 1,
      1, 0,
      1, 0,
      0, 1,
      1, 1,

      0, 0,
      0, 1,
      1, 0,
      0, 1,
      1, 1,
      1, 0,

      0, 0,
      0, 1,
      1, 0,
      1, 0,
      0, 1,
      1, 1,
  ]
  gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);

  let offsets = [];
  let colors = [];
  let index = [];
  for (let i = 0; i < SIDE; i++) {
    const x = (-SIDE + 1) * 3 / 2 + i * 3;
    for (let j = 0; j < SIDE; j++) {
      const y = (-SIDE + 1) * 3 / 2 + j * 3;
      offsets.push(x, y, 0.0);
      let color = Math.random() * 0.75 + 0.25
      colors.push(Math.random() * 0.75 + 0.25, Math.random() * 0.75 + 0.25, color, 1.0)
      index.push(i/SIDE,j/SIDE)
    }
  }

  const instanceOffsets = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceOffsets);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(offsets), gl.STATIC_DRAW);

  const instanceColors = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceColors);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  const instanceIndex = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceIndex);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(index), gl.STATIC_DRAW);

  //const colors = new Float32Array(SIDE * SIDE * 4).map(
    //() => Math.random() * 0.75 + 0.25
  //);

  const animatedImageTexture = initVideoTexture(gl);

  return {
    vertexCount: positions.length / 3,
    positions: positionBuffer,
    textureCoord: textureCoordBuffer,
    normals: normalBuffer,
    instanceOffsets,
    instanceColors,
    instanceIndex,
    animatedImageTexture,
  };
}

//
// Draw the scene.
//
let sceneTime2d = 0;
function drawScene2d(gl, programInfo, buffers, deltaTime, width, height) {
  // Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
  gl.viewport(0,0, width || gl.canvas.clientWidth, height || gl.canvas.clientHeight);

  // Clear the canvas before we start drawing on it.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const fieldOfView = 45 * Math.PI / 180;   // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 1.0;
  const zFar = 2048.0;
  const projectionMatrix = mat4.create();

  // note: glmatrix.js always has the first argument
  // as the destination to receive the result.
  mat4.perspective(projectionMatrix,
                   fieldOfView,
                   aspect,
                   zNear,
                   zFar);

const easeOut = t => (1 - Math.abs(Math.pow(t-1, 3)))
const easeIn  = t => Math.pow(t, 3)


  const viewMatrix = mat4.create();
  const distance = easeIn((Math.sin(-sceneTime2d * 0.2) +1) / 2) * 12;
  mat4.lookAt(viewMatrix,
    // eye
    [
      Math.cos(sceneTime2d * 0.18) * SIDE / 3,
      Math.sin(sceneTime2d * 0.24) * SIDE / 3,
      distance * (Math.sin(sceneTime2d * 0.035) + 1) * SIDE / 8 + 32,
    ],
    // center
    [0,0,0],
    // up
    [0,1,0]
  );

  mat4.multiply(projectionMatrix, projectionMatrix, viewMatrix);

  const modelViewMatrix = mat4.create();

  // Now move the drawing position a bit to where we want to
  // start drawing the square.

  const rotation = Math.sin(sceneTime2d)

  mat4.scale(modelViewMatrix,     // destination matrix
                 modelViewMatrix,     // matrix to translate
                [2, 2, 2]);       // axis to rotate around (X)
  mat4.rotate(modelViewMatrix,     // destination matrix
                 modelViewMatrix,     // matrix to translate
                 rotation,// amount to rotate in radians
                [1.0, 0.0, 0.0]);       // axis to rotate around (X)

    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

    gl.uniformMatrix4fv(
        programInfo.uniformLocations.uModel,
        false,
        modelViewMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.uNormal,
        false,
        normalMatrix);

  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute
  {
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positions);
    gl.vertexAttribPointer(
        programInfo.attribLocations.positions,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.positions);
  }

  {
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normals);
    gl.vertexAttribPointer(
        programInfo.attribLocations.aNormals,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.aNormals);
  }

  {
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
    gl.vertexAttribPointer(
        programInfo.attribLocations.aTextureCoord,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.aTextureCoord);
  }


  if (loadedGif) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    updateVideoTexture(gl, buffers.animatedImageTexture, selectFrame(loadedGif.completeFrames, loadedGif.completeFrames.length/loadedGif.duration, sceneTime2d));
  }

  // Tell the shader we bound the texture to texture unit 0
  gl.uniform1i(programInfo.uniformLocations.uAnimated, 0);



  gl.uniformMatrix4fv(
      programInfo.uniformLocations.uProjection,
      false,
      projectionMatrix);

  gl.uniform2f(
     programInfo.uniformLocations.u_resolution,
     width || gl.canvas.clientWidth, height || gl.canvas.clientHeight);

  gl.uniform1f(
     programInfo.uniformLocations.u_time,
     sceneTime2d);

    // Instanced position data
    gl.enableVertexAttribArray(programInfo.attribLocations.instanceOffsets);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.instanceOffsets);
    gl.vertexAttribPointer(programInfo.attribLocations.instanceOffsets, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(programInfo.attribLocations.instanceOffsets, 1);

    // Instanced color data
    //gl.enableVertexAttribArray(programInfo.attribLocations.instanceColors);
    //gl.bindBuffer(gl.ARRAY_BUFFER, buffers.instanceColors);
    //gl.vertexAttribPointer(programInfo.attribLocations.instanceColors, 4, gl.FLOAT, false, 0, 0);
    //gl.vertexAttribDivisor(programInfo.attribLocations.instanceColors, 1);

    gl.enableVertexAttribArray(programInfo.attribLocations.instanceIndex);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.instanceIndex);
    gl.vertexAttribPointer(programInfo.attribLocations.instanceIndex, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(programInfo.attribLocations.instanceIndex, 1);

  {
    const offset = 0;
    const vertexCount = buffers.vertexCount;
    const instanceCount = SIDE * SIDE;
    gl.drawArraysInstanced(gl.TRIANGLES, offset, vertexCount, instanceCount);
  }

  sceneTime2d += deltaTime;
}

