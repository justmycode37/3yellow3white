import type { CameraState } from './types.js';

/** The same packed triangles and camera data are submitted by both backends. */
export interface RenderBatch {
  camera: CameraState;
  width: number;
  height: number;
  rect?: number[];
  opaqueVertices: number;
  floatCount: number;
}

const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec3 world;
layout(location=1) in vec4 color;
layout(location=2) in float screen;
layout(location=3) in vec3 normal;
layout(location=4) in float lit;
layout(location=5) in float layer;
layout(location=6) in vec2 viewportOffset;
uniform vec4 focus;
uniform vec4 angles;
uniform vec4 viewport;
out vec4 vColor;
out vec3 vNormal;
out float vLit;
void main() {
  vec3 p=world-focus.xyz;
  float cy=cos(-angles.x), sy=sin(-angles.x);
  p=vec3(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);
  float cp=cos(-angles.y), sp=sin(-angles.y);
  p=vec3(p.x,p.y*cp-p.z*sp,p.y*sp+p.z*cp);
  float depth=angles.z-p.z;
  float divisor=mix(1.,depth/angles.z,angles.w);
  float halfHeight=viewport.z/2.;
  vec4 position=vec4(p.x/halfHeight*viewport.y/viewport.x,p.y/halfHeight,(depth-0.01)/(angles.z*100.-0.01)*divisor,divisor);
  if(screen>0.5) position=vec4(world.x*2./viewport.x,world.y*2./viewport.y,0.0001,1.);
  position.z-=layer*0.00000002*position.w;
  position.xy+=viewportOffset*2.*position.w;
  // WebGPU clip depth is [0,w]; OpenGL clip depth is [-w,w].
  position.z=2.*position.z-position.w;
  gl_Position=position;
  vec3 n=vec3(normal.x*cy+normal.z*sy,normal.y,-normal.x*sy+normal.z*cy);
  vNormal=vec3(n.x,n.y*cp-n.z*sp,n.y*sp+n.z*cp);
  vLit=lit; vColor=color;
}`;
const fragment = `#version 300 es
precision highp float;
in vec4 vColor;
in vec3 vNormal;
in float vLit;
out vec4 outputColor;
void main() {
  vec4 color=vColor;
  if(vLit>0.5) {
    float amount=0.32+0.68*max(0.,dot(normalize(vNormal),normalize(vec3(-0.4,0.65,1.))));
    color=vec4(color.rgb*amount,color.a);
  }
  outputColor=color;
}`;

/** WebGL2 submission only; scene evaluation, tessellation and ordering live in CanvasRenderer. */
export class WebGLBackend {
  private program: WebGLProgram;
  private buffer: WebGLBuffer;
  private vao: WebGLVertexArrayObject;
  private focus: WebGLUniformLocation;
  private angles: WebGLUniformLocation;
  private viewport: WebGLUniformLocation;
  private capacity = 0;
  readonly maxSize: number;

  constructor(readonly gl: WebGL2RenderingContext) {
    const shaders: WebGLShader[] = [];
    let program: WebGLProgram | null = null, buffer: WebGLBuffer | null = null, vao: WebGLVertexArrayObject | null = null;
    try {
      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type);
        if (!shader) throw new Error('WebGL2 could not allocate a shader.');
        shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`WebGL2 shader: ${gl.getShaderInfoLog(shader)}`);
        return shader;
      };
      program = gl.createProgram();
      if (!program) throw new Error('WebGL2 could not allocate a program.');
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`WebGL2 program: ${gl.getProgramInfoLog(program)}`);
      buffer = gl.createBuffer(); vao = gl.createVertexArray();
      if (!buffer || !vao) throw new Error('WebGL2 could not allocate geometry resources.');
      this.program = program; this.buffer = buffer; this.vao = vao;
      const uniform = (name: string) => {
        const value = gl.getUniformLocation(program!, name);
        if (value === null) throw new Error(`WebGL2 camera uniform missing: ${name}`);
        return value;
      };
      this.focus = uniform('focus'); this.angles = uniform('angles'); this.viewport = uniform('viewport');
      gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      for (const [location, size, offset] of [[0,3,0],[1,4,12],[2,1,28],[3,3,32],[4,1,44],[5,1,48],[6,2,52]]) {
        gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, size, gl.FLOAT, false, 60, offset);
      }
      gl.bindVertexArray(null);
      const viewportLimits = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
      this.maxSize = Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), viewportLimits[0], viewportLimits[1]);
      if (gl.isContextLost() || gl.getError() !== gl.NO_ERROR) throw new Error('WebGL2 initialization failed.');
    } catch (error) {
      if (vao) gl.deleteVertexArray(vao);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      throw error;
    } finally { for (const shader of shaders) gl.deleteShader(shader); }
  }

  render(data: Float32Array, batches: RenderBatch[], clear: number[], width: number, height: number): void {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    gl.useProgram(this.program); gl.bindVertexArray(this.vao); gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    if (data.byteLength > this.capacity) {
      this.capacity = Math.max(256, data.byteLength * 2);
      gl.bufferData(gl.ARRAY_BUFFER, this.capacity, gl.DYNAMIC_DRAW);
      if (!gl.isContextLost() && gl.getError() !== gl.NO_ERROR) throw new Error('WebGL2 could not allocate the scene vertex buffer.');
    }
    if (data.length) gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
    gl.disable(gl.CULL_FACE); gl.disable(gl.SCISSOR_TEST);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
    gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(clear[0], clear[1], clear[2], 1); gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    let first = 0;
    for (const batch of batches) {
      // Match WebGPU's independent depth attachment clear for every view/overlay.
      gl.disable(gl.SCISSOR_TEST); gl.depthMask(true); gl.clear(gl.DEPTH_BUFFER_BIT);
      const [x, top, w, h] = batch.rect ?? [0, 0, width, height];
      const y = height - top - h;
      gl.viewport(x, y, w, h); gl.enable(gl.SCISSOR_TEST); gl.scissor(x, y, w, h);
      const c = batch.camera;
      gl.uniform4f(this.focus, ...c.target, 0);
      gl.uniform4f(this.angles, c.yaw, c.pitch, c.distance, c.perspective);
      gl.uniform4f(this.viewport, batch.width, batch.height, c.height, 0);
      const count = batch.floatCount / 15;
      if (batch.opaqueVertices) gl.drawArrays(gl.TRIANGLES, first, batch.opaqueVertices);
      gl.depthMask(false);
      if (count > batch.opaqueVertices) gl.drawArrays(gl.TRIANGLES, first + batch.opaqueVertices, count - batch.opaqueVertices);
      first += count;
    }
    gl.depthMask(true); gl.disable(gl.SCISSOR_TEST); gl.bindVertexArray(null);
  }

  dispose(): void {
    this.gl.deleteBuffer(this.buffer); this.gl.deleteVertexArray(this.vao); this.gl.deleteProgram(this.program);
  }
}
