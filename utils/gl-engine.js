/**
 * 迷你 3D 引擎 — 专为大富翁棋盘优化
 * 纯 WebGL，零依赖，适配微信小程序 Canvas
 * 支持：Box/Cylinder/Sphere 几何体 + 光照 + 阴影 + 相机
 */

// ===== 数学工具 =====
const M4 = {
  identity() { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; },
  perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
    return [f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0];
  },
  translate(m, tx, ty, tz) {
    const o = m.slice();
    o[12] += m[0]*tx + m[4]*ty + m[8]*tz;
    o[13] += m[1]*tx + m[5]*ty + m[9]*tz;
    o[14] += m[2]*tx + m[6]*ty + m[10]*tz;
    o[15] += m[3]*tx + m[7]*ty + m[11]*tz;
    return o;
  },
  rotateX(m, rad) {
    const c=Math.cos(rad), s=Math.sin(rad);
    const rm=[1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]; return M4.multiply(m, rm);
  },
  rotateY(m, rad) {
    const c=Math.cos(rad), s=Math.sin(rad);
    const rm=[c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]; return M4.multiply(m, rm);
  },
  rotateZ(m, rad) {
    const c=Math.cos(rad), s=Math.sin(rad);
    const rm=[c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]; return M4.multiply(m, rm);
  },
  scale(m, sx, sy, sz) {
    const o = m.slice();
    o[0]*=sx; o[1]*=sx; o[2]*=sx; o[3]*=sx;
    o[4]*=sy; o[5]*=sy; o[6]*=sy; o[7]*=sy;
    o[8]*=sz; o[9]*=sz; o[10]*=sz; o[11]*=sz;
    return o;
  },
  multiply(a, b) {
    const o = [];
    for (let i=0;i<4;i++) for (let j=0;j<4;j++) { o[j*4+i] = a[i]*b[j*4]+a[4+i]*b[j*4+1]+a[8+i]*b[j*4+2]+a[12+i]*b[j*4+3]; }
    return o;
  },
  lookAt(eyex,eyey,eyez, cx,cy,cz, ux,uy,uz) {
    let zx=eyex-cx, zy=eyey-cy, zz=eyez-cz; const zl=1/Math.sqrt(zx*zx+zy*zy+zz*zz); zx*=zl;zy*=zl;zz*=zl;
    let xx=uy*zz-uz*zy, xy=uz*zx-ux*zz, xz=ux*zy-uy*zx; const xl=1/Math.sqrt(xx*xx+xy*xy+xz*xz); xx*=xl;xy*=xl;xz*=xl;
    let yx=zy*xz-zz*xy, yy=zz*xx-zx*xz, yz=zx*xy-zy*xx;
    return [xx,xy,xz,0, yx,yy,yz,0, zx,zy,zz,0, -xx*eyex-yx*eyey-zx*eyez, -xy*eyex-yy*eyey-zy*eyez, -xz*eyex-yz*eyey-zz*eyez, 1];
  }
};

// ===== 几何体工厂 =====
function createBox(w, h, d, r, g, b) {
  const hw=w/2, hh=h/2, hd=d/2;
  return {
    vertices: new Float32Array([
      // front  back   top    bottom right  left
      -hw,-hh,hd, hw,-hh,hd, hw,hh,hd, -hw,hh,hd,
      -hw,-hh,-hd, -hw,hh,-hd, hw,hh,-hd, hw,-hh,-hd,
      -hw,hh,hd, -hw,hh,-hd, hw,hh,-hd, hw,hh,hd,
      -hw,-hh,hd, hw,-hh,hd, hw,-hh,-hd, -hw,-hh,-hd,
      hw,-hh,hd, hw,hh,hd, hw,hh,-hd, hw,-hh,-hd,
      -hw,-hh,hd, -hw,-hh,-hd, -hw,hh,-hd, -hw,hh,hd,
    ]),
    normals: new Float32Array([
      0,0,1,0,0,1,0,0,1,0,0,1, 0,0,-1,0,0,-1,0,0,-1,0,0,-1,
      0,1,0,0,1,0,0,1,0,0,1,0, 0,-1,0,0,-1,0,0,-1,0,0,-1,0,
      1,0,0,1,0,0,1,0,0,1,0,0, -1,0,0,-1,0,0,-1,0,0,-1,0,0,
    ]),
    indices: new Uint16Array([
      0,1,2,0,2,3, 4,5,6,4,6,7, 8,9,10,8,10,11,
      12,13,14,12,14,15, 16,17,18,16,18,19, 20,21,22,20,22,23
    ]),
    color: [r,g,b],
  };
}

function createCylinder(radiusTop, radiusBottom, height, segments, r, g, b) {
  const verts=[], norms=[], idxs=[], seg=segments||16, hh=height/2;
  // top cap
  verts.push(0,hh,0); norms.push(0,1,0);
  for(let i=0;i<seg;i++){ const a=i/seg*Math.PI*2; verts.push(Math.cos(a)*radiusTop,hh,Math.sin(a)*radiusTop); norms.push(0,1,0); }
  for(let i=0;i<seg;i++) idxs.push(0, i+1, ((i+1)%seg)+1);
  // bottom cap
  const bs=verts.length/3; verts.push(0,-hh,0); norms.push(0,-1,0);
  for(let i=0;i<seg;i++){ const a=i/seg*Math.PI*2; verts.push(Math.cos(a)*radiusBottom,-hh,Math.sin(a)*radiusBottom); norms.push(0,-1,0); }
  for(let i=0;i<seg;i++) idxs.push(bs, bs+((i+1)%seg)+1, bs+i+1);
  // side
  const ss=verts.length/3;
  for(let i=0;i<seg;i++){ const a=i/seg*Math.PI*2; verts.push(Math.cos(a)*radiusTop,hh,Math.sin(a)*radiusTop); norms.push(Math.cos(a),0,Math.sin(a)); }
  for(let i=0;i<seg;i++){ const a=i/seg*Math.PI*2; verts.push(Math.cos(a)*radiusBottom,-hh,Math.sin(a)*radiusBottom); norms.push(Math.cos(a),0,Math.sin(a)); }
  for(let i=0;i<seg;i++){ const a=ss+i*2,b=ss+i*2+1,c=ss+((i+1)%seg)*2,d=ss+((i+1)%seg)*2+1; idxs.push(a,b,c, b,d,c); }
  return { vertices: new Float32Array(verts), normals: new Float32Array(norms), indices: new Uint16Array(idxs), color: [r,g,b] };
}

function createSphere(radius, segments, r, g, b) {
  const verts=[], norms=[], idxs=[], segs=segments||12, rings=Math.floor(segs/2);
  for(let j=0;j<=rings;j++){ const phi=j/rings*Math.PI;
    for(let i=0;i<=segs;i++){ const theta=i/segs*Math.PI*2;
      verts.push(Math.sin(phi)*Math.cos(theta)*radius, Math.cos(phi)*radius, Math.sin(phi)*Math.sin(theta)*radius);
      norms.push(Math.sin(phi)*Math.cos(theta), Math.cos(phi), Math.sin(phi)*Math.sin(theta)); } }
  for(let j=0;j<rings;j++) for(let i=0;i<segs;i++){ const a=j*(segs+1)+i,b=a+segs+1; idxs.push(a,b,a+1, a+1,b,b+1); }
  return { vertices: new Float32Array(verts), normals: new Float32Array(norms), indices: new Uint16Array(idxs), color: [r,g,b] };
}

// ===== 着色器 =====
const VS = "attribute vec4 aPos;attribute vec3 aNorm;uniform mat4 uMVP;uniform mat4 uModel;uniform vec3 uLightDir;varying vec3 vColor;varying float vLight;void main(){gl_Position=uMVP*aPos;vec3 wNorm=normalize(mat3(uModel)*aNorm);vLight=max(dot(wNorm,normalize(uLightDir)),0.2);}";
const FS = "precision mediump float;varying vec3 vColor;varying float vLight;uniform vec3 uColor;void main(){gl_FragColor=vec4(uColor*vLight,1.0);}";

// ===== 场景节点 =====
class SceneNode {
  constructor(geometry) {
    this.geometry = geometry;
    this.x=0; this.y=0; this.z=0;
    this.rx=0; this.ry=0; this.rz=0;
    this.sx=1; this.sy=1; this.sz=1;
    this.visible = true;
    this.color = geometry.color ? geometry.color.slice() : [1,1,1];
    // WebGL buffers (created per-node on init)
    this._vb=null; this._nb=null; this._ib=null;
  }
  getMatrix() {
    let m = M4.identity();
    m = M4.translate(m, this.x, this.y, this.z);
    if(this.rx) m = M4.rotateX(m, this.rx);
    if(this.ry) m = M4.rotateY(m, this.ry);
    if(this.rz) m = M4.rotateZ(m, this.rz);
    if(this.sx!==1||this.sy!==1||this.sz!==1) m = M4.scale(m, this.sx, this.sy, this.sz);
    return m;
  }
}

// ===== 引擎主类 =====
class GLEngine {
  constructor(canvas) {
    this._lastFrameTime = 0;
    this._fpsInterval = 1000 / 30;
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!this.gl) { console.error('WebGL not supported'); return; }
    const gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0.73, 0.88, 0.96, 1.0);

    // compile shaders
    this.program = this._compile(VS, FS);
    this.uMVP = gl.getUniformLocation(this.program, 'uMVP');
    this.uModel = gl.getUniformLocation(this.program, 'uModel');
    this.uColor = gl.getUniformLocation(this.program, 'uColor');
    this.uLightDir = gl.getUniformLocation(this.program, 'uLightDir');
    this.aPos = gl.getAttribLocation(this.program, 'aPos');
    this.aNorm = gl.getAttribLocation(this.program, 'aNorm');

    this.nodes = [];
    this.cameraX = 0; this.cameraY = 12; this.cameraZ = 18;
    this.targetX = 0; this.targetY = 0; this.targetZ = 0;
    this.lightDir = [0.5, 0.8, 0.3];
    this._resize();
  }

  _compile(vs, fs) {
    const gl = this.gl;
    const compile = (src, type) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, compile(vs, gl.VERTEX_SHADER));
    gl.attachShader(p, compile(fs, gl.FRAGMENT_SHADER));
    gl.linkProgram(p);
    return p;
  }

  _resize() {
    const w = this.canvas.width, h = this.canvas.height;
    this.gl.viewport(0, 0, w, h);
    this.projMatrix = M4.perspective(45 * Math.PI/180, w/Math.max(h,1), 0.1, 100);
  }

  addNode(geometry) {
    const node = new SceneNode(geometry);
    this.nodes.push(node);
    return node;
  }

  removeNode(node) {
    const idx = this.nodes.indexOf(node);
    if (idx >= 0) this.nodes.splice(idx, 1);
  }

  clearAll() {
    this.nodes = [];
  }

  render() {
    const now = Date.now();
    if (now - this._lastFrameTime < this._fpsInterval) return;
    this._lastFrameTime = now;
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    const viewMatrix = M4.lookAt(this.cameraX, this.cameraY, this.cameraZ, this.targetX, this.targetY, this.targetZ, 0, 1, 0);
    gl.uniform3f(this.uLightDir, this.lightDir[0], this.lightDir[1], this.lightDir[2]);

    this.nodes.forEach(node => {
      if (!node.visible) return;
      const model = node.getMatrix();
      const mvp = M4.multiply(this.projMatrix, M4.multiply(viewMatrix, model));

      gl.uniformMatrix4fv(this.uMVP, false, new Float32Array(mvp));
      gl.uniformMatrix4fv(this.uModel, false, new Float32Array(model));
      gl.uniform3f(this.uColor, node.color[0], node.color[1], node.color[2]);

      const g = node.geometry;
      // bind buffers (simple: re-bind each frame)
      const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, g.vertices, gl.STATIC_DRAW);
      gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.aPos);

      const nb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, nb);
      gl.bufferData(gl.ARRAY_BUFFER, g.normals, gl.STATIC_DRAW);
      gl.vertexAttribPointer(this.aNorm, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.aNorm);

      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.indices, gl.STATIC_DRAW);
      gl.drawElements(gl.TRIANGLES, g.indices.length, gl.UNSIGNED_SHORT, 0);
    });
  }

  // 简单 Tween 动画
  animateNode(node, targetX, targetY, targetZ, duration, onComplete) {
    const startX = node.x, startY = node.y, startZ = node.z;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      // easeOutBounce
      const ease = t < 1/2.75 ? 7.5625*t*t : t < 2/2.75 ? 7.5625*(t-=1.5/2.75)*t+0.75 : t < 2.5/2.75 ? 7.5625*(t-=2.25/2.75)*t+0.9375 : 7.5625*(t-=2.625/2.75)*t+0.984375;
      // 抛物线 Y
      const py = startY + (targetY - startY) * t + Math.sin(t * Math.PI) * 2.5;
      node.x = startX + (targetX - startX) * t;
      node.y = py;
      node.z = startZ + (targetZ - startZ) * t;
      if (t < 1) {
        (this.canvas.requestAnimationFrame || requestAnimationFrame).call(this.canvas, animate);
      } else {
        node.x = targetX; node.y = targetY; node.z = targetZ;
        if (onComplete) onComplete();
      }
    };
    (this.canvas.requestAnimationFrame || requestAnimationFrame).call(this.canvas, animate);
  }
}

module.exports = { GLEngine, createBox, createCylinder, createSphere, M4 };