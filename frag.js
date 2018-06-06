//
// Start here
//
//
function main2d() {
  const gl = initGL({
    initProgram: initProgram2d,
    drawScene: drawScene2d,
  });
}

function initProgram2d(gl) {
  // Vertex shader program

  const vsSource = `
    #ifdef GL_ES
      precision mediump float;
    #endif

    attribute vec4 aVertexPosition;

    uniform vec2 u_resolution;
    uniform float u_time;

    varying vec4 vColor;


    void main(void) {
      gl_Position = aVertexPosition;
    }
  `;

  // Fragment shader program

  const fsSource = `
    #ifdef GL_ES
      precision mediump float;
    #endif

    #define PI 3.14159265359

    uniform vec2 u_resolution;
    uniform float u_time;

    varying vec4 vColor;

    float random (vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    mat3 iwindow_scale = mat3(
        vec3(u_resolution.x/u_resolution.y, 0.0, 0.0),
        vec3(    0.0, 1.0, 0.0),
        vec3(    0.0, 0.0, 1.0)
    );
    mat3 window_scale = mat3(
        vec3(u_resolution.y/u_resolution.x, 0.0, 0.0),
        vec3(    0.0, 1.0, 0.0),
        vec3(    0.0, 0.0, 1.0)
    );

    mat4 scale(float x, float y, float z) {
        return mat4(
            vec4(x,   0.0, 0.0, 0.0),
            vec4(0.0, y,   0.0, 0.0),
            vec4(0.0, 0.0, z,   0.0),
            vec4(0.0, 0.0, 0.0, 1.0)
        );
    }

    mat4 rotationMatrix(vec3 axis, float angle) {
      axis = normalize(axis);
      float s = sin(angle);
      float c = cos(angle);
      float oc = 1.0 - c;

      return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                  oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                  oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                  0.0,                                0.0,                                0.0,                                1.0);
    }

    void main(void) {
      //mat4 modelViewMatrix = rotationMatrix(vec3(0.0, 0.0, 1.0), u_time * PI) *  scale(0.5, 0.5, 1.0);
      //mat4 projectionMatrix = mat4(window_scale);
      vec2 st = gl_FragCoord.xy / u_resolution.xy;
      //st = vec2(0.5) - st;
      //st *= 2.0;
      gl_FragColor = vec4(fract(st), abs(sin(u_time)), 1.0);
      st *= 4.;
      //st += vec2(u_time);

      st *= 2.;
      st = (iwindow_scale * vec3(st, 1.0)).xy;

      st.x += step(1., mod(st.y,2.0)) * 1. * abs(sin(u_time * PI)) * step(.5, sin(fract(u_time)));
      st.x -= step(mod(st.y,2.0), 1.0) * 1. * abs(sin(u_time * PI)) * step(.5, sin(fract(u_time)));
      st.y += step(1., mod(st.x,2.0)) * 1. * abs(sin(u_time * PI)) * step(sin(fract(u_time)), .5);
      st.y -= step(mod(st.x,2.0), 1.0) * 1. * abs(sin(u_time * PI)) * step(sin(fract(u_time)), .5);


      vec2 fracts = fract(st);
      vec2 whole = floor(st);
      //gl_FragColor = mix(vec4(st, 0.0, 1.0), vColor, 0.0);
      gl_FragColor += step(length((fracts-0.5) * 2.0), 0.6);
      //gl_FragColor += step(1.0, mod(whole.x, 2.0)) * vec4(1.0);
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
    },
    uniformLocations: {
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

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just
// have one object -- a simple two-dimensional square.
//
function initBuffers2d(gl) {

  // Create a buffer for the square's positions.
  const positionBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Now create an array of positions for the square.
  const positions = [
     1.0,  1.0,
    -1.0,  1.0,
     1.0, -1.0,
    -1.0, -1.0,
  ];

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  return {
    position: positionBuffer,
  };
}

//
// Draw the scene.
//
function drawScene2d(gl, programInfo, buffers, time, width, height) {
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

  // Set the shader uniforms
  gl.uniform2f(
     programInfo.uniformLocations.u_resolution,
     width || gl.canvas.clientWidth, height || gl.canvas.clientHeight);

  gl.uniform1f(
     programInfo.uniformLocations.u_time,
     time);

  {
    const offset = 0;
    const vertexCount = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
  }
}

