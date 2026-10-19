/* ==========================================================================
   Save the Date — water-drop transition
   A drop falls on "Save the Date"; rings of water spread across the screen,
   refracting the scene, and the hero film emerges through the ripples.

   Two images are blended in a WebGL shader:
     from — the "Save the Date" screen (drawn into a canvas)
     to   — the current frame of the hero film (updated every frame)
   Exposes window.WaterDrop.play(fromCanvas, video, opts) → Promise.
   Falls back to a soft circular reveal when WebGL is unavailable.
   ========================================================================== */
(function () {
  "use strict";

  var VERT =
    "attribute vec2 p;varying vec2 uv;" +
    "void main(){uv=p*0.5+0.5;uv.y=1.0-uv.y;gl_Position=vec4(p,0.0,1.0);}";

  // t: 0 → 1 over the transition. Rings of a damped wave spread from the drop;
  // their slope bends the image (refraction) and adds a moonlit glint; the film
  // takes over behind the leading ring.
  var FRAG = [
    "precision highp float;",
    "varying vec2 uv;",
    "uniform sampler2D from, to;",
    "uniform float t, aspect;",
    "uniform vec2 drop, fromScale, toScale, fromOff, toOff;",
    "uniform vec3 tint;",
    "float wave(float d, float r){",
    "  float x = d - r;",
    "  return sin(x * 46.0) * exp(-x * x * 14.0);",
    "}",
    "void main(){",
    "  vec2 q = uv - drop; q.x *= aspect;",
    "  float d = length(q);",
    "  vec2 dir = d > 0.0001 ? q / d : vec2(0.0);",
    "  float r = t * 1.55;                         // leading ring radius",
    "  float amp = 0.035 * (1.0 - t) * (1.0 - t);  // ripples calm down",
    "  float h = wave(d, r) + 0.6 * wave(d, r * 0.62) + 0.35 * wave(d, r * 0.34);",
    "  vec2 off = dir * h * amp; off.x /= aspect;",
    "  vec4 a = texture2D(from, fromOff + (uv + off) * fromScale);",
    "  vec4 b = texture2D(to,   toOff   + (uv + off * 0.6) * toScale);",
    "  float m = smoothstep(r - 0.05, r - 0.32, d);  // film inside the ring",
    "  m = max(m, smoothstep(0.82, 1.0, t));",
    "  vec4 c = mix(a, b, m);",
    "  float glint = max(0.0, h) * (1.0 - t) * 0.28;",
    "  c.rgb += tint * glint;",
    "  gl_FragColor = c;",
    "}"
  ].join("\n");

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function texture(gl) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  // "object-fit: cover" mapping of a w×h source into the canvas
  function cover(sw, sh, cw, ch) {
    var s = Math.max(cw / sw, ch / sh);
    var w = (cw / s) / sw, h = (ch / s) / sh;
    return { scale: [w, h], off: [(1 - w) / 2, (1 - h) / 2] };
  }

  function playWebGL(canvas, fromCanvas, video, opts) {
    var gl = canvas.getContext("webgl", { premultipliedAlpha: false });
    if (!gl) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var u = function (n) { return gl.getUniformLocation(prog, n); };
    gl.activeTexture(gl.TEXTURE0);
    var texFrom = texture(gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fromCanvas);
    gl.activeTexture(gl.TEXTURE1);
    var texTo = texture(gl);
    gl.uniform1i(u("from"), 0);
    gl.uniform1i(u("to"), 1);

    var cw = canvas.width, ch = canvas.height;
    gl.viewport(0, 0, cw, ch);
    gl.uniform1f(u("aspect"), cw / ch);
    gl.uniform2f(u("drop"), opts.drop[0], opts.drop[1]);
    gl.uniform3f(u("tint"), 0.75, 0.84, 1.0);
    gl.uniform2f(u("fromScale"), 1, 1);
    gl.uniform2f(u("fromOff"), 0, 0);
    var vc = cover(video.videoWidth || cw, video.videoHeight || ch, cw, ch);
    gl.uniform2f(u("toScale"), vc.scale[0], vc.scale[1]);
    gl.uniform2f(u("toOff"), vc.off[0], vc.off[1]);

    return new Promise(function (resolve) {
      var start = null;
      (function frame(now) {
        if (start === null) start = now;
        var t = Math.min(1, (now - start) / opts.duration);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, texTo);
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        } catch (e) { /* video frame not ready yet */ }
        gl.uniform1f(u("t"), t);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      })(performance.now());
    });
  }

  function playFallback(el, opts) {
    // soft circular reveal of the film, centred on the drop
    el.style.transition = "clip-path " + opts.duration + "ms cubic-bezier(0.65, 0, 0.35, 1)";
    el.style.clipPath = "circle(150% at " + opts.drop[0] * 100 + "% " + opts.drop[1] * 100 + "%)";
    return new Promise(function (resolve) { setTimeout(resolve, opts.duration); });
  }

  window.WaterDrop = {
    /** canvas: full-screen <canvas>; fromCanvas: snapshot of the Save the Date screen;
        video: the hero film; fallbackEl: element to reveal if WebGL is missing */
    play: function (canvas, fromCanvas, video, fallbackEl, opts) {
      opts = Object.assign({ duration: 2600, drop: [0.5, 0.5] }, opts || {});
      var run = null;
      try { run = playWebGL(canvas, fromCanvas, video, opts); } catch (e) { run = null; }
      return run || playFallback(fallbackEl, opts);
    },
  };
})();
