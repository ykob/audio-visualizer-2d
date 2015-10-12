(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function(object, eventType, callback){
  var timer;

  object.addEventListener(eventType, function(event) {
    clearTimeout(timer);
    timer = setTimeout(function(){
      callback(event);
    }, 500);
  }, false);
};

},{}],2:[function(require,module,exports){
var Vector2 = require('./vector2');

var exports = {
  friction: function(acceleration, mu, normal, mass) {
    var force = acceleration.clone();
    if (!normal) normal = 1;
    if (!mass) mass = 1;
    force.multiplyScalar(-1);
    force.normalize();
    force.multiplyScalar(mu);
    return force;
  },
  drag: function(acceleration, value) {
    var force = acceleration.clone();
    force.multiplyScalar(-1);
    force.normalize();
    force.multiplyScalar(acceleration.length() * value);
    return force;
  },
  hook: function(velocity, anchor, rest_length, k) {
    var force = velocity.clone().sub(anchor);
    var distance = force.length() - rest_length;
    force.normalize();
    force.multiplyScalar(-1 * k * distance);
    return force;
  }
};

module.exports = exports;

},{"./vector2":6}],3:[function(require,module,exports){
var Util = require('./util');
var Vector2 = require('./vector2');
var Force = require('./force');
var debounce = require('./debounce');
var Mover = require('./mover');

var body = document.body;
var body_width  = body.clientWidth * 2;
var body_height = body.clientHeight * 2;
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var audio_ctx = new (window.AudioContext || window.webkitAudioContext)();
var audio_analyser = audio_ctx.createAnalyser();
var audio_buffer = new XMLHttpRequest();
//var audio_url = 'https://api.soundcloud.com/tracks/89297698/stream?client_id=0aaf73b4de24ee4e86313e01d458083d';
var audio_url = 'https://api.soundcloud.com/tracks/127070185/stream?client_id=0aaf73b4de24ee4e86313e01d458083d';
var fft_size = 512;
var movers = [];
var last_time_xxx = Date.now();
var vector_touch_start = new Vector2();
var vector_touch_move = new Vector2();
var vector_touch_end = new Vector2();
var is_touched = false;

var init = function() {
  poolMover();
  initAudio();
  setEvent();
  resizeCanvas();
  renderloop();
  debounce(window, 'resize', function(event){
    resizeCanvas();
  });
};

var initAudio = function() {
  audio_analyser.fft_size = fft_size;
  audio_analyser.connect(audio_ctx.destination);
  loadAudio();
};

var loadAudio = function() {
  var request = new XMLHttpRequest();
  
  request.open('GET', audio_url, true);
  request.responseType = 'arraybuffer';
  request.onload = function() {
    audio_ctx.decodeAudioData(request.response, function(buffer) {
      audio_buffer = buffer;
      playAudio();
    });
  };
  request.send();
};

var playAudio = function() {
  var source = audio_ctx.createBufferSource();
  
  source.buffer = audio_buffer;
  source.connect(audio_analyser);
  source.loop = true;
  source.loopStart = 0;
  source.loopEnd = audio_buffer.duration;
  source.playbackRate.value = 1.0;
  source.start(0);
};

var poolMover = function() {
  for (var i = 0; i < fft_size; i++) {
    var mover = new Mover();
    var deg = i / fft_size * 360;
    var rad = Util.getRadian(deg);
    var x = Math.cos(rad) + body_width / 2;
    var y = Math.sin(rad) + body_height / 2;
    var position = new Vector2(x, y);
    
    mover.init(position, 20);
    mover.h = Math.abs(deg - 180) / 4;
    movers.push(mover);
  }
};

var updateMover = function() {
  var spectrums = new Uint8Array(audio_analyser.frequencyBinCount);
  var str = '';
  var length = 0;
  
  audio_analyser.getByteTimeDomainData(spectrums);
  spectrum_length = audio_analyser.frequencyBinCount;
  
  for (var i = 0; i < movers.length; i++) {
    var mover = movers[i];
    var rad = Util.getRadian(i / movers.length * 360);
    var r = body_height / 3;
    var x = Math.cos(rad) * r + body_width / 2;
    var y = Math.sin(rad) * r + body_height / 2;
    var size = Math.pow(Math.abs(spectrums[i * 2] - 128) / 128 + 1.1, 7);

    mover.h += 0.1
    mover.radius = size;
    mover.velocity.set(x, y);
    mover.updateVelocity();
    mover.updatePosition();
    mover.draw(ctx);
  }
};

var render = function() {
  ctx.globalCompositeOperation = 'lighter';
  ctx.clearRect(0, 0, body_width, body_height);
  updateMover();
};

var renderloop = function() {
  var now = Date.now();
  
  requestAnimationFrame(renderloop);
  render();
  // if (now - last_time_xxx > 1000) {
  //   function_name();
  //   last_time_xxx = Date.now();
  // }
};

var resizeCanvas = function() {
  body_width  = body.clientWidth * 2;
  body_height = body.clientHeight * 2;

  canvas.width = body_width;
  canvas.height = body_height;
  canvas.style.width = body_width / 2 + 'px';
  canvas.style.height = body_height / 2 + 'px';
};

var setEvent = function () {
  var eventTouchStart = function(x, y) {
    vector_touch_start.set(x, y);
    is_touched = true;
  };
  
  var eventTouchMove = function(x, y) {
    vector_touch_move.set(x, y);
    if (is_touched) {
      
    }
  };
  
  var eventTouchEnd = function(x, y) {
    vector_touch_end.set(x, y);
    is_touched = false;
  };

  canvas.addEventListener('contextmenu', function (event) {
    event.preventDefault();
  });

  canvas.addEventListener('selectstart', function (event) {
    event.preventDefault();
  });

  canvas.addEventListener('mousedown', function (event) {
    event.preventDefault();
    eventTouchStart(event.clientX * 2, event.clientY * 2);
  });

  canvas.addEventListener('mousemove', function (event) {
    event.preventDefault();
    eventTouchMove(event.clientX * 2, event.clientY * 2);
  });

  canvas.addEventListener('mouseup', function (event) {
    event.preventDefault();
    eventTouchEnd();
  });

  canvas.addEventListener('touchstart', function (event) {
    event.preventDefault();
    eventTouchStart(event.touches[0].clientX * 2, event.touches[0].clientY * 2);
  });

  canvas.addEventListener('touchmove', function (event) {
    event.preventDefault();
    eventTouchMove(event.touches[0].clientX * 2, event.touches[0].clientY * 2);
  });

  canvas.addEventListener('touchend', function (event) {
    event.preventDefault();
    eventTouchEnd();
  });
};

init();

},{"./debounce":1,"./force":2,"./mover":4,"./util":5,"./vector2":6}],4:[function(require,module,exports){
var Util = require('./util');
var Vector2 = require('./vector2');
var Force = require('./force');

var exports = function(){
  var Mover = function() {
    this.position = new Vector2();
    this.velocity = new Vector2();
    this.acceleration = new Vector2();
    this.anchor = new Vector2();
    this.radius = 0;
    this.mass = 1;
    this.direction = 0;
    this.h = 0;
    this.s = 80;
    this.l = 15;
    this.a = 0.5;
    this.time = 0;
    this.is_active = false;
  };
  
  Mover.prototype = {
    init: function(vector, size) {
      this.radius = size;
      this.mass = this.radius / 100;
      this.position = vector.clone();
      this.velocity = vector.clone();
      this.anchor = vector.clone();
      this.acceleration.set(0, 0);
      this.a = 1;
      this.time = 0;
    },
    updatePosition: function() {
      this.position.copy(this.velocity);
    },
    updateVelocity: function() {
      this.velocity.add(this.acceleration);
      if (this.velocity.distanceTo(this.position) >= 1) {
        this.direct(this.velocity);
      }
    },
    applyForce: function(vector) {
      this.acceleration.add(vector);
    },
    applyFriction: function() {
      var friction = Force.friction(this.acceleration, 0.1);
      this.applyForce(friction);
    },
    applyDragForce: function(value) {
      var drag = Force.drag(this.acceleration, value);
      this.applyForce(drag);
    },
    hook: function(rest_length, k) {
      var force = Force.hook(this.velocity, this.anchor, rest_length, k);
      this.applyForce(force);
    },
    direct: function(vector) {
      var v = vector.clone().sub(this.position);
      this.direction = Math.atan2(v.y, v.x);
    },
    draw: function(context) {
      context.fillStyle = 'hsla(' + this.h + ',' + this.s + '%,' + this.l + '%,' + this.a + ')';
      context.beginPath();
      context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI / 180, true);
      context.fill();
    },
    activate: function () {
      this.is_active = true;
    },
    inactivate: function () {
      this.is_active = false;
    }
  };
  
  return Mover;
};

module.exports = exports();

},{"./force":2,"./util":5,"./vector2":6}],5:[function(require,module,exports){
var exports = {
  getRandomInt: function(min, max){
    return Math.floor(Math.random() * (max - min)) + min;
  },
  getDegree: function(radian) {
    return radian / Math.PI * 180;
  },
  getRadian: function(degrees) {
    return degrees * Math.PI / 180;
  },
  getSpherical: function(rad1, rad2, r) {
    var x = Math.cos(rad1) * Math.cos(rad2) * r;
    var z = Math.cos(rad1) * Math.sin(rad2) * r;
    var y = Math.sin(rad1) * r;
    return [x, y, z];
  }
};

module.exports = exports;

},{}],6:[function(require,module,exports){
// 
// このVector2クラスは、three.jsのTHREE.Vector2クラスの計算式の一部を利用しています。
// https://github.com/mrdoob/three.js/blob/master/src/math/Vector2.js#L367
// 

var exports = function(){
  var Vector2 = function(x, y) {
    this.x = x || 0;
    this.y = y || 0;
  };
  
  Vector2.prototype = {
    set: function (x, y) {
      this.x = x;
      this.y = y;
      return this;
    },
    clone: function () {
      return new Vector2(this.x, this.y);
    },
    copy: function (v) {
      this.x = v.x;
      this.y = v.y;
      return this;
    },
    add: function (v) {
      this.x += v.x;
      this.y += v.y;
      return this;
    },
    addScalar: function (s) {
      this.x += s;
      this.y += s;
      return this;
    },
    sub: function (v) {
      this.x -= v.x;
      this.y -= v.y;
      return this;
    },
    subScalar: function (s) {
      this.x -= s;
      this.y -= s;
      return this;
    },
    multiply: function (v) {
      this.x *= v.x;
      this.y *= v.y;
      return this;
    },
    multiplyScalar: function (s) {
      this.x *= s;
      this.y *= s;
      return this;
    },
    divide: function (v) {
      this.x /= v.x;
      this.y /= v.y;
      return this;
    },
    divideScalar: function (s) {
      if (this.x !== 0 && s !== 0) this.x /= s;
      if (this.y !== 0 && s !== 0) this.y /= s;
      return this;
    },
    min: function (v) {
      if (this.x < v.x) this.x = v.x;
      if (this.y < v.y) this.y = v.y;
      return this;
    },
    max: function (v) {
      if (this.x > v.x) this.x = v.x;
      if (this.y > v.y) this.y = v.y;
      return this;
    },
    clamp: function (v_min, v_max) {
      if (this.x < v_min.x) {
        this.x = v_min.x;
      } else if (this.x > v_max.x) {
        this.x = v_max.x;
      }
      if (this.y < v_min.y) {
        this.y = v_min.y;
      } else if (this.y > v_max.y) {
        this.y = v_max.y;
      }
      return this;
    },
    clampScalar: function () {
      var min, max;
      return function clampScalar(minVal, maxVal) {
        if (min === undefined) {
          min = new Vector2();
          max = new Vector2();
        }
        min.set(minVal, minVal);
        max.set(maxVal, maxVal);
        return this.clamp(min, max);
      };
    }(),
    floor: function () {
      this.x = Math.floor(this.x);
      this.y = Math.floor(this.y);
      return this;
    },
    ceil: function () {
      this.x = Math.ceil(this.x);
      this.y = Math.ceil(this.y);
      return this;
    },
    round: function () {
      this.x = Math.round(this.x);
      this.y = Math.round(this.y);
      return this;
    },
    roundToZero: function () {
      this.x = (this.x < 0) ? Math.ceil(this.x) : Math.floor(this.x);
      this.y = (this.y < 0) ? Math.ceil(this.y) : Math.floor(this.y);
      return this;
    },
    negate: function () {
      this.x = - this.x;
      this.y = - this.y;
      return this;
    },
    dot: function (v) {
      return this.x * v.x + this.y * v.y;
    },
    lengthSq: function () {
      return this.x * this.x + this.y * this.y;
    },
    length: function () {
      return Math.sqrt(this.lengthSq());
    },
    lengthManhattan: function() {
      return Math.abs(this.x) + Math.abs(this.y);
    },
    normalize: function () {
      return this.divideScalar(this.length());
    },
    distanceTo: function (v) {
      var dx = this.x - v.x;
      var dy = this.y - v.y;
      return Math.sqrt(dx * dx + dy * dy);
    },
    distanceToSquared: function (v) {
      var dx = this.x - v.x, dy = this.y - v.y;
      return dx * dx + dy * dy;
    },
    setLength: function (l) {
      var oldLength = this.length();
      if (oldLength !== 0 && l !== oldLength) {
        this.multScalar(l / oldLength);
      }
      return this;
    },
    lerp: function (v, alpha) {
      this.x += (v.x - this.x) * alpha;
      this.y += (v.y - this.y) * alpha;
      return this;
    },
    lerpVectors: function (v1, v2, alpha) {
      this.subVectors(v2, v1).multiplyScalar(alpha).add(v1);
      return this;
    },
    equals: function (v) {
      return ((v.x === this.x) && (v.y === this.y));
    },
    fromArray: function (array, offset) {
      if (offset === undefined) offset = 0;
      this.x = array[ offset ];
      this.y = array[ offset + 1 ];
      return this;
    },
    toArray: function (array, offset) {
      if (array === undefined) array = [];
      if (offset === undefined) offset = 0;
      array[ offset ] = this.x;
      array[ offset + 1 ] = this.y;
      return array;
    },
    fromAttribute: function (attribute, index, offset) {
      if (offset === undefined) offset = 0;
      index = index * attribute.itemSize + offset;
      this.x = attribute.array[ index ];
      this.y = attribute.array[ index + 1 ];
      return this;
    }
  }

  return Vector2;
};

module.exports = exports();

},{}]},{},[3])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvZGVib3VuY2UuanMiLCJzcmMvanMvZm9yY2UuanMiLCJzcmMvanMvbWFpbi5qcyIsInNyYy9qcy9tb3Zlci5qcyIsInNyYy9qcy91dGlsLmpzIiwic3JjL2pzL3ZlY3RvcjIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvYmplY3QsIGV2ZW50VHlwZSwgY2FsbGJhY2spe1xuICB2YXIgdGltZXI7XG5cbiAgb2JqZWN0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCBmdW5jdGlvbihldmVudCkge1xuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICBjYWxsYmFjayhldmVudCk7XG4gICAgfSwgNTAwKTtcbiAgfSwgZmFsc2UpO1xufTtcbiIsInZhciBWZWN0b3IyID0gcmVxdWlyZSgnLi92ZWN0b3IyJyk7XG5cbnZhciBleHBvcnRzID0ge1xuICBmcmljdGlvbjogZnVuY3Rpb24oYWNjZWxlcmF0aW9uLCBtdSwgbm9ybWFsLCBtYXNzKSB7XG4gICAgdmFyIGZvcmNlID0gYWNjZWxlcmF0aW9uLmNsb25lKCk7XG4gICAgaWYgKCFub3JtYWwpIG5vcm1hbCA9IDE7XG4gICAgaWYgKCFtYXNzKSBtYXNzID0gMTtcbiAgICBmb3JjZS5tdWx0aXBseVNjYWxhcigtMSk7XG4gICAgZm9yY2Uubm9ybWFsaXplKCk7XG4gICAgZm9yY2UubXVsdGlwbHlTY2FsYXIobXUpO1xuICAgIHJldHVybiBmb3JjZTtcbiAgfSxcbiAgZHJhZzogZnVuY3Rpb24oYWNjZWxlcmF0aW9uLCB2YWx1ZSkge1xuICAgIHZhciBmb3JjZSA9IGFjY2VsZXJhdGlvbi5jbG9uZSgpO1xuICAgIGZvcmNlLm11bHRpcGx5U2NhbGFyKC0xKTtcbiAgICBmb3JjZS5ub3JtYWxpemUoKTtcbiAgICBmb3JjZS5tdWx0aXBseVNjYWxhcihhY2NlbGVyYXRpb24ubGVuZ3RoKCkgKiB2YWx1ZSk7XG4gICAgcmV0dXJuIGZvcmNlO1xuICB9LFxuICBob29rOiBmdW5jdGlvbih2ZWxvY2l0eSwgYW5jaG9yLCByZXN0X2xlbmd0aCwgaykge1xuICAgIHZhciBmb3JjZSA9IHZlbG9jaXR5LmNsb25lKCkuc3ViKGFuY2hvcik7XG4gICAgdmFyIGRpc3RhbmNlID0gZm9yY2UubGVuZ3RoKCkgLSByZXN0X2xlbmd0aDtcbiAgICBmb3JjZS5ub3JtYWxpemUoKTtcbiAgICBmb3JjZS5tdWx0aXBseVNjYWxhcigtMSAqIGsgKiBkaXN0YW5jZSk7XG4gICAgcmV0dXJuIGZvcmNlO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHM7XG4iLCJ2YXIgVXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIFZlY3RvcjIgPSByZXF1aXJlKCcuL3ZlY3RvcjInKTtcbnZhciBGb3JjZSA9IHJlcXVpcmUoJy4vZm9yY2UnKTtcbnZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJy4vZGVib3VuY2UnKTtcbnZhciBNb3ZlciA9IHJlcXVpcmUoJy4vbW92ZXInKTtcblxudmFyIGJvZHkgPSBkb2N1bWVudC5ib2R5O1xudmFyIGJvZHlfd2lkdGggID0gYm9keS5jbGllbnRXaWR0aCAqIDI7XG52YXIgYm9keV9oZWlnaHQgPSBib2R5LmNsaWVudEhlaWdodCAqIDI7XG52YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpO1xudmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xudmFyIGF1ZGlvX2N0eCA9IG5ldyAod2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0KSgpO1xudmFyIGF1ZGlvX2FuYWx5c2VyID0gYXVkaW9fY3R4LmNyZWF0ZUFuYWx5c2VyKCk7XG52YXIgYXVkaW9fYnVmZmVyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4vL3ZhciBhdWRpb191cmwgPSAnaHR0cHM6Ly9hcGkuc291bmRjbG91ZC5jb20vdHJhY2tzLzg5Mjk3Njk4L3N0cmVhbT9jbGllbnRfaWQ9MGFhZjczYjRkZTI0ZWU0ZTg2MzEzZTAxZDQ1ODA4M2QnO1xudmFyIGF1ZGlvX3VybCA9ICdodHRwczovL2FwaS5zb3VuZGNsb3VkLmNvbS90cmFja3MvMTI3MDcwMTg1L3N0cmVhbT9jbGllbnRfaWQ9MGFhZjczYjRkZTI0ZWU0ZTg2MzEzZTAxZDQ1ODA4M2QnO1xudmFyIGZmdF9zaXplID0gNTEyO1xudmFyIG1vdmVycyA9IFtdO1xudmFyIGxhc3RfdGltZV94eHggPSBEYXRlLm5vdygpO1xudmFyIHZlY3Rvcl90b3VjaF9zdGFydCA9IG5ldyBWZWN0b3IyKCk7XG52YXIgdmVjdG9yX3RvdWNoX21vdmUgPSBuZXcgVmVjdG9yMigpO1xudmFyIHZlY3Rvcl90b3VjaF9lbmQgPSBuZXcgVmVjdG9yMigpO1xudmFyIGlzX3RvdWNoZWQgPSBmYWxzZTtcblxudmFyIGluaXQgPSBmdW5jdGlvbigpIHtcbiAgcG9vbE1vdmVyKCk7XG4gIGluaXRBdWRpbygpO1xuICBzZXRFdmVudCgpO1xuICByZXNpemVDYW52YXMoKTtcbiAgcmVuZGVybG9vcCgpO1xuICBkZWJvdW5jZSh3aW5kb3csICdyZXNpemUnLCBmdW5jdGlvbihldmVudCl7XG4gICAgcmVzaXplQ2FudmFzKCk7XG4gIH0pO1xufTtcblxudmFyIGluaXRBdWRpbyA9IGZ1bmN0aW9uKCkge1xuICBhdWRpb19hbmFseXNlci5mZnRfc2l6ZSA9IGZmdF9zaXplO1xuICBhdWRpb19hbmFseXNlci5jb25uZWN0KGF1ZGlvX2N0eC5kZXN0aW5hdGlvbik7XG4gIGxvYWRBdWRpbygpO1xufTtcblxudmFyIGxvYWRBdWRpbyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICBcbiAgcmVxdWVzdC5vcGVuKCdHRVQnLCBhdWRpb191cmwsIHRydWUpO1xuICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgYXVkaW9fY3R4LmRlY29kZUF1ZGlvRGF0YShyZXF1ZXN0LnJlc3BvbnNlLCBmdW5jdGlvbihidWZmZXIpIHtcbiAgICAgIGF1ZGlvX2J1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgIHBsYXlBdWRpbygpO1xuICAgIH0pO1xuICB9O1xuICByZXF1ZXN0LnNlbmQoKTtcbn07XG5cbnZhciBwbGF5QXVkaW8gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNvdXJjZSA9IGF1ZGlvX2N0eC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgXG4gIHNvdXJjZS5idWZmZXIgPSBhdWRpb19idWZmZXI7XG4gIHNvdXJjZS5jb25uZWN0KGF1ZGlvX2FuYWx5c2VyKTtcbiAgc291cmNlLmxvb3AgPSB0cnVlO1xuICBzb3VyY2UubG9vcFN0YXJ0ID0gMDtcbiAgc291cmNlLmxvb3BFbmQgPSBhdWRpb19idWZmZXIuZHVyYXRpb247XG4gIHNvdXJjZS5wbGF5YmFja1JhdGUudmFsdWUgPSAxLjA7XG4gIHNvdXJjZS5zdGFydCgwKTtcbn07XG5cbnZhciBwb29sTW92ZXIgPSBmdW5jdGlvbigpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBmZnRfc2l6ZTsgaSsrKSB7XG4gICAgdmFyIG1vdmVyID0gbmV3IE1vdmVyKCk7XG4gICAgdmFyIGRlZyA9IGkgLyBmZnRfc2l6ZSAqIDM2MDtcbiAgICB2YXIgcmFkID0gVXRpbC5nZXRSYWRpYW4oZGVnKTtcbiAgICB2YXIgeCA9IE1hdGguY29zKHJhZCkgKyBib2R5X3dpZHRoIC8gMjtcbiAgICB2YXIgeSA9IE1hdGguc2luKHJhZCkgKyBib2R5X2hlaWdodCAvIDI7XG4gICAgdmFyIHBvc2l0aW9uID0gbmV3IFZlY3RvcjIoeCwgeSk7XG4gICAgXG4gICAgbW92ZXIuaW5pdChwb3NpdGlvbiwgMjApO1xuICAgIG1vdmVyLmggPSBNYXRoLmFicyhkZWcgLSAxODApIC8gNDtcbiAgICBtb3ZlcnMucHVzaChtb3Zlcik7XG4gIH1cbn07XG5cbnZhciB1cGRhdGVNb3ZlciA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc3BlY3RydW1zID0gbmV3IFVpbnQ4QXJyYXkoYXVkaW9fYW5hbHlzZXIuZnJlcXVlbmN5QmluQ291bnQpO1xuICB2YXIgc3RyID0gJyc7XG4gIHZhciBsZW5ndGggPSAwO1xuICBcbiAgYXVkaW9fYW5hbHlzZXIuZ2V0Qnl0ZVRpbWVEb21haW5EYXRhKHNwZWN0cnVtcyk7XG4gIHNwZWN0cnVtX2xlbmd0aCA9IGF1ZGlvX2FuYWx5c2VyLmZyZXF1ZW5jeUJpbkNvdW50O1xuICBcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBtb3ZlcnMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgbW92ZXIgPSBtb3ZlcnNbaV07XG4gICAgdmFyIHJhZCA9IFV0aWwuZ2V0UmFkaWFuKGkgLyBtb3ZlcnMubGVuZ3RoICogMzYwKTtcbiAgICB2YXIgciA9IGJvZHlfaGVpZ2h0IC8gMztcbiAgICB2YXIgeCA9IE1hdGguY29zKHJhZCkgKiByICsgYm9keV93aWR0aCAvIDI7XG4gICAgdmFyIHkgPSBNYXRoLnNpbihyYWQpICogciArIGJvZHlfaGVpZ2h0IC8gMjtcbiAgICB2YXIgc2l6ZSA9IE1hdGgucG93KE1hdGguYWJzKHNwZWN0cnVtc1tpICogMl0gLSAxMjgpIC8gMTI4ICsgMS4xLCA3KTtcblxuICAgIG1vdmVyLmggKz0gMC4xXG4gICAgbW92ZXIucmFkaXVzID0gc2l6ZTtcbiAgICBtb3Zlci52ZWxvY2l0eS5zZXQoeCwgeSk7XG4gICAgbW92ZXIudXBkYXRlVmVsb2NpdHkoKTtcbiAgICBtb3Zlci51cGRhdGVQb3NpdGlvbigpO1xuICAgIG1vdmVyLmRyYXcoY3R4KTtcbiAgfVxufTtcblxudmFyIHJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICBjdHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gJ2xpZ2h0ZXInO1xuICBjdHguY2xlYXJSZWN0KDAsIDAsIGJvZHlfd2lkdGgsIGJvZHlfaGVpZ2h0KTtcbiAgdXBkYXRlTW92ZXIoKTtcbn07XG5cbnZhciByZW5kZXJsb29wID0gZnVuY3Rpb24oKSB7XG4gIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICBcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlcmxvb3ApO1xuICByZW5kZXIoKTtcbiAgLy8gaWYgKG5vdyAtIGxhc3RfdGltZV94eHggPiAxMDAwKSB7XG4gIC8vICAgZnVuY3Rpb25fbmFtZSgpO1xuICAvLyAgIGxhc3RfdGltZV94eHggPSBEYXRlLm5vdygpO1xuICAvLyB9XG59O1xuXG52YXIgcmVzaXplQ2FudmFzID0gZnVuY3Rpb24oKSB7XG4gIGJvZHlfd2lkdGggID0gYm9keS5jbGllbnRXaWR0aCAqIDI7XG4gIGJvZHlfaGVpZ2h0ID0gYm9keS5jbGllbnRIZWlnaHQgKiAyO1xuXG4gIGNhbnZhcy53aWR0aCA9IGJvZHlfd2lkdGg7XG4gIGNhbnZhcy5oZWlnaHQgPSBib2R5X2hlaWdodDtcbiAgY2FudmFzLnN0eWxlLndpZHRoID0gYm9keV93aWR0aCAvIDIgKyAncHgnO1xuICBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gYm9keV9oZWlnaHQgLyAyICsgJ3B4Jztcbn07XG5cbnZhciBzZXRFdmVudCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGV2ZW50VG91Y2hTdGFydCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB2ZWN0b3JfdG91Y2hfc3RhcnQuc2V0KHgsIHkpO1xuICAgIGlzX3RvdWNoZWQgPSB0cnVlO1xuICB9O1xuICBcbiAgdmFyIGV2ZW50VG91Y2hNb3ZlID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHZlY3Rvcl90b3VjaF9tb3ZlLnNldCh4LCB5KTtcbiAgICBpZiAoaXNfdG91Y2hlZCkge1xuICAgICAgXG4gICAgfVxuICB9O1xuICBcbiAgdmFyIGV2ZW50VG91Y2hFbmQgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgdmVjdG9yX3RvdWNoX2VuZC5zZXQoeCwgeSk7XG4gICAgaXNfdG91Y2hlZCA9IGZhbHNlO1xuICB9O1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdjb250ZXh0bWVudScsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gIH0pO1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdzZWxlY3RzdGFydCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gIH0pO1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50VG91Y2hTdGFydChldmVudC5jbGllbnRYICogMiwgZXZlbnQuY2xpZW50WSAqIDIpO1xuICB9KTtcblxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudFRvdWNoTW92ZShldmVudC5jbGllbnRYICogMiwgZXZlbnQuY2xpZW50WSAqIDIpO1xuICB9KTtcblxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnRUb3VjaEVuZCgpO1xuICB9KTtcblxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnRUb3VjaFN0YXJ0KGV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WCAqIDIsIGV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WSAqIDIpO1xuICB9KTtcblxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudFRvdWNoTW92ZShldmVudC50b3VjaGVzWzBdLmNsaWVudFggKiAyLCBldmVudC50b3VjaGVzWzBdLmNsaWVudFkgKiAyKTtcbiAgfSk7XG5cbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudFRvdWNoRW5kKCk7XG4gIH0pO1xufTtcblxuaW5pdCgpO1xuIiwidmFyIFV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBWZWN0b3IyID0gcmVxdWlyZSgnLi92ZWN0b3IyJyk7XG52YXIgRm9yY2UgPSByZXF1aXJlKCcuL2ZvcmNlJyk7XG5cbnZhciBleHBvcnRzID0gZnVuY3Rpb24oKXtcbiAgdmFyIE1vdmVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wb3NpdGlvbiA9IG5ldyBWZWN0b3IyKCk7XG4gICAgdGhpcy52ZWxvY2l0eSA9IG5ldyBWZWN0b3IyKCk7XG4gICAgdGhpcy5hY2NlbGVyYXRpb24gPSBuZXcgVmVjdG9yMigpO1xuICAgIHRoaXMuYW5jaG9yID0gbmV3IFZlY3RvcjIoKTtcbiAgICB0aGlzLnJhZGl1cyA9IDA7XG4gICAgdGhpcy5tYXNzID0gMTtcbiAgICB0aGlzLmRpcmVjdGlvbiA9IDA7XG4gICAgdGhpcy5oID0gMDtcbiAgICB0aGlzLnMgPSA4MDtcbiAgICB0aGlzLmwgPSAxNTtcbiAgICB0aGlzLmEgPSAwLjU7XG4gICAgdGhpcy50aW1lID0gMDtcbiAgICB0aGlzLmlzX2FjdGl2ZSA9IGZhbHNlO1xuICB9O1xuICBcbiAgTW92ZXIucHJvdG90eXBlID0ge1xuICAgIGluaXQ6IGZ1bmN0aW9uKHZlY3Rvciwgc2l6ZSkge1xuICAgICAgdGhpcy5yYWRpdXMgPSBzaXplO1xuICAgICAgdGhpcy5tYXNzID0gdGhpcy5yYWRpdXMgLyAxMDA7XG4gICAgICB0aGlzLnBvc2l0aW9uID0gdmVjdG9yLmNsb25lKCk7XG4gICAgICB0aGlzLnZlbG9jaXR5ID0gdmVjdG9yLmNsb25lKCk7XG4gICAgICB0aGlzLmFuY2hvciA9IHZlY3Rvci5jbG9uZSgpO1xuICAgICAgdGhpcy5hY2NlbGVyYXRpb24uc2V0KDAsIDApO1xuICAgICAgdGhpcy5hID0gMTtcbiAgICAgIHRoaXMudGltZSA9IDA7XG4gICAgfSxcbiAgICB1cGRhdGVQb3NpdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnBvc2l0aW9uLmNvcHkodGhpcy52ZWxvY2l0eSk7XG4gICAgfSxcbiAgICB1cGRhdGVWZWxvY2l0eTogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnZlbG9jaXR5LmFkZCh0aGlzLmFjY2VsZXJhdGlvbik7XG4gICAgICBpZiAodGhpcy52ZWxvY2l0eS5kaXN0YW5jZVRvKHRoaXMucG9zaXRpb24pID49IDEpIHtcbiAgICAgICAgdGhpcy5kaXJlY3QodGhpcy52ZWxvY2l0eSk7XG4gICAgICB9XG4gICAgfSxcbiAgICBhcHBseUZvcmNlOiBmdW5jdGlvbih2ZWN0b3IpIHtcbiAgICAgIHRoaXMuYWNjZWxlcmF0aW9uLmFkZCh2ZWN0b3IpO1xuICAgIH0sXG4gICAgYXBwbHlGcmljdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZnJpY3Rpb24gPSBGb3JjZS5mcmljdGlvbih0aGlzLmFjY2VsZXJhdGlvbiwgMC4xKTtcbiAgICAgIHRoaXMuYXBwbHlGb3JjZShmcmljdGlvbik7XG4gICAgfSxcbiAgICBhcHBseURyYWdGb3JjZTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHZhciBkcmFnID0gRm9yY2UuZHJhZyh0aGlzLmFjY2VsZXJhdGlvbiwgdmFsdWUpO1xuICAgICAgdGhpcy5hcHBseUZvcmNlKGRyYWcpO1xuICAgIH0sXG4gICAgaG9vazogZnVuY3Rpb24ocmVzdF9sZW5ndGgsIGspIHtcbiAgICAgIHZhciBmb3JjZSA9IEZvcmNlLmhvb2sodGhpcy52ZWxvY2l0eSwgdGhpcy5hbmNob3IsIHJlc3RfbGVuZ3RoLCBrKTtcbiAgICAgIHRoaXMuYXBwbHlGb3JjZShmb3JjZSk7XG4gICAgfSxcbiAgICBkaXJlY3Q6IGZ1bmN0aW9uKHZlY3Rvcikge1xuICAgICAgdmFyIHYgPSB2ZWN0b3IuY2xvbmUoKS5zdWIodGhpcy5wb3NpdGlvbik7XG4gICAgICB0aGlzLmRpcmVjdGlvbiA9IE1hdGguYXRhbjIodi55LCB2LngpO1xuICAgIH0sXG4gICAgZHJhdzogZnVuY3Rpb24oY29udGV4dCkge1xuICAgICAgY29udGV4dC5maWxsU3R5bGUgPSAnaHNsYSgnICsgdGhpcy5oICsgJywnICsgdGhpcy5zICsgJyUsJyArIHRoaXMubCArICclLCcgKyB0aGlzLmEgKyAnKSc7XG4gICAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgY29udGV4dC5hcmModGhpcy5wb3NpdGlvbi54LCB0aGlzLnBvc2l0aW9uLnksIHRoaXMucmFkaXVzLCAwLCBNYXRoLlBJIC8gMTgwLCB0cnVlKTtcbiAgICAgIGNvbnRleHQuZmlsbCgpO1xuICAgIH0sXG4gICAgYWN0aXZhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuaXNfYWN0aXZlID0gdHJ1ZTtcbiAgICB9LFxuICAgIGluYWN0aXZhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuaXNfYWN0aXZlID0gZmFsc2U7XG4gICAgfVxuICB9O1xuICBcbiAgcmV0dXJuIE1vdmVyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzKCk7XG4iLCJ2YXIgZXhwb3J0cyA9IHtcbiAgZ2V0UmFuZG9tSW50OiBmdW5jdGlvbihtaW4sIG1heCl7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pKSArIG1pbjtcbiAgfSxcbiAgZ2V0RGVncmVlOiBmdW5jdGlvbihyYWRpYW4pIHtcbiAgICByZXR1cm4gcmFkaWFuIC8gTWF0aC5QSSAqIDE4MDtcbiAgfSxcbiAgZ2V0UmFkaWFuOiBmdW5jdGlvbihkZWdyZWVzKSB7XG4gICAgcmV0dXJuIGRlZ3JlZXMgKiBNYXRoLlBJIC8gMTgwO1xuICB9LFxuICBnZXRTcGhlcmljYWw6IGZ1bmN0aW9uKHJhZDEsIHJhZDIsIHIpIHtcbiAgICB2YXIgeCA9IE1hdGguY29zKHJhZDEpICogTWF0aC5jb3MocmFkMikgKiByO1xuICAgIHZhciB6ID0gTWF0aC5jb3MocmFkMSkgKiBNYXRoLnNpbihyYWQyKSAqIHI7XG4gICAgdmFyIHkgPSBNYXRoLnNpbihyYWQxKSAqIHI7XG4gICAgcmV0dXJuIFt4LCB5LCB6XTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzO1xuIiwiLy8gXG4vLyDjgZPjga5WZWN0b3Iy44Kv44Op44K544Gv44CBdGhyZWUuanPjga5USFJFRS5WZWN0b3Iy44Kv44Op44K544Gu6KiI566X5byP44Gu5LiA6YOo44KS5Yip55So44GX44Gm44GE44G+44GZ44CCXG4vLyBodHRwczovL2dpdGh1Yi5jb20vbXJkb29iL3RocmVlLmpzL2Jsb2IvbWFzdGVyL3NyYy9tYXRoL1ZlY3RvcjIuanMjTDM2N1xuLy8gXG5cbnZhciBleHBvcnRzID0gZnVuY3Rpb24oKXtcbiAgdmFyIFZlY3RvcjIgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgdGhpcy54ID0geCB8fCAwO1xuICAgIHRoaXMueSA9IHkgfHwgMDtcbiAgfTtcbiAgXG4gIFZlY3RvcjIucHJvdG90eXBlID0ge1xuICAgIHNldDogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgIHRoaXMueCA9IHg7XG4gICAgICB0aGlzLnkgPSB5O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBjbG9uZTogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5ldyBWZWN0b3IyKHRoaXMueCwgdGhpcy55KTtcbiAgICB9LFxuICAgIGNvcHk6IGZ1bmN0aW9uICh2KSB7XG4gICAgICB0aGlzLnggPSB2Lng7XG4gICAgICB0aGlzLnkgPSB2Lnk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGFkZDogZnVuY3Rpb24gKHYpIHtcbiAgICAgIHRoaXMueCArPSB2Lng7XG4gICAgICB0aGlzLnkgKz0gdi55O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBhZGRTY2FsYXI6IGZ1bmN0aW9uIChzKSB7XG4gICAgICB0aGlzLnggKz0gcztcbiAgICAgIHRoaXMueSArPSBzO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBzdWI6IGZ1bmN0aW9uICh2KSB7XG4gICAgICB0aGlzLnggLT0gdi54O1xuICAgICAgdGhpcy55IC09IHYueTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc3ViU2NhbGFyOiBmdW5jdGlvbiAocykge1xuICAgICAgdGhpcy54IC09IHM7XG4gICAgICB0aGlzLnkgLT0gcztcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgbXVsdGlwbHk6IGZ1bmN0aW9uICh2KSB7XG4gICAgICB0aGlzLnggKj0gdi54O1xuICAgICAgdGhpcy55ICo9IHYueTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgbXVsdGlwbHlTY2FsYXI6IGZ1bmN0aW9uIChzKSB7XG4gICAgICB0aGlzLnggKj0gcztcbiAgICAgIHRoaXMueSAqPSBzO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBkaXZpZGU6IGZ1bmN0aW9uICh2KSB7XG4gICAgICB0aGlzLnggLz0gdi54O1xuICAgICAgdGhpcy55IC89IHYueTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZGl2aWRlU2NhbGFyOiBmdW5jdGlvbiAocykge1xuICAgICAgaWYgKHRoaXMueCAhPT0gMCAmJiBzICE9PSAwKSB0aGlzLnggLz0gcztcbiAgICAgIGlmICh0aGlzLnkgIT09IDAgJiYgcyAhPT0gMCkgdGhpcy55IC89IHM7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIG1pbjogZnVuY3Rpb24gKHYpIHtcbiAgICAgIGlmICh0aGlzLnggPCB2LngpIHRoaXMueCA9IHYueDtcbiAgICAgIGlmICh0aGlzLnkgPCB2LnkpIHRoaXMueSA9IHYueTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgbWF4OiBmdW5jdGlvbiAodikge1xuICAgICAgaWYgKHRoaXMueCA+IHYueCkgdGhpcy54ID0gdi54O1xuICAgICAgaWYgKHRoaXMueSA+IHYueSkgdGhpcy55ID0gdi55O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBjbGFtcDogZnVuY3Rpb24gKHZfbWluLCB2X21heCkge1xuICAgICAgaWYgKHRoaXMueCA8IHZfbWluLngpIHtcbiAgICAgICAgdGhpcy54ID0gdl9taW4ueDtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy54ID4gdl9tYXgueCkge1xuICAgICAgICB0aGlzLnggPSB2X21heC54O1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMueSA8IHZfbWluLnkpIHtcbiAgICAgICAgdGhpcy55ID0gdl9taW4ueTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy55ID4gdl9tYXgueSkge1xuICAgICAgICB0aGlzLnkgPSB2X21heC55O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBjbGFtcFNjYWxhcjogZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG1pbiwgbWF4O1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uIGNsYW1wU2NhbGFyKG1pblZhbCwgbWF4VmFsKSB7XG4gICAgICAgIGlmIChtaW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIG1pbiA9IG5ldyBWZWN0b3IyKCk7XG4gICAgICAgICAgbWF4ID0gbmV3IFZlY3RvcjIoKTtcbiAgICAgICAgfVxuICAgICAgICBtaW4uc2V0KG1pblZhbCwgbWluVmFsKTtcbiAgICAgICAgbWF4LnNldChtYXhWYWwsIG1heFZhbCk7XG4gICAgICAgIHJldHVybiB0aGlzLmNsYW1wKG1pbiwgbWF4KTtcbiAgICAgIH07XG4gICAgfSgpLFxuICAgIGZsb29yOiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLnggPSBNYXRoLmZsb29yKHRoaXMueCk7XG4gICAgICB0aGlzLnkgPSBNYXRoLmZsb29yKHRoaXMueSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGNlaWw6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMueCA9IE1hdGguY2VpbCh0aGlzLngpO1xuICAgICAgdGhpcy55ID0gTWF0aC5jZWlsKHRoaXMueSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHJvdW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLnggPSBNYXRoLnJvdW5kKHRoaXMueCk7XG4gICAgICB0aGlzLnkgPSBNYXRoLnJvdW5kKHRoaXMueSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHJvdW5kVG9aZXJvOiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLnggPSAodGhpcy54IDwgMCkgPyBNYXRoLmNlaWwodGhpcy54KSA6IE1hdGguZmxvb3IodGhpcy54KTtcbiAgICAgIHRoaXMueSA9ICh0aGlzLnkgPCAwKSA/IE1hdGguY2VpbCh0aGlzLnkpIDogTWF0aC5mbG9vcih0aGlzLnkpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBuZWdhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMueCA9IC0gdGhpcy54O1xuICAgICAgdGhpcy55ID0gLSB0aGlzLnk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGRvdDogZnVuY3Rpb24gKHYpIHtcbiAgICAgIHJldHVybiB0aGlzLnggKiB2LnggKyB0aGlzLnkgKiB2Lnk7XG4gICAgfSxcbiAgICBsZW5ndGhTcTogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueTtcbiAgICB9LFxuICAgIGxlbmd0aDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLmxlbmd0aFNxKCkpO1xuICAgIH0sXG4gICAgbGVuZ3RoTWFuaGF0dGFuOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBNYXRoLmFicyh0aGlzLngpICsgTWF0aC5hYnModGhpcy55KTtcbiAgICB9LFxuICAgIG5vcm1hbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZGl2aWRlU2NhbGFyKHRoaXMubGVuZ3RoKCkpO1xuICAgIH0sXG4gICAgZGlzdGFuY2VUbzogZnVuY3Rpb24gKHYpIHtcbiAgICAgIHZhciBkeCA9IHRoaXMueCAtIHYueDtcbiAgICAgIHZhciBkeSA9IHRoaXMueSAtIHYueTtcbiAgICAgIHJldHVybiBNYXRoLnNxcnQoZHggKiBkeCArIGR5ICogZHkpO1xuICAgIH0sXG4gICAgZGlzdGFuY2VUb1NxdWFyZWQ6IGZ1bmN0aW9uICh2KSB7XG4gICAgICB2YXIgZHggPSB0aGlzLnggLSB2LngsIGR5ID0gdGhpcy55IC0gdi55O1xuICAgICAgcmV0dXJuIGR4ICogZHggKyBkeSAqIGR5O1xuICAgIH0sXG4gICAgc2V0TGVuZ3RoOiBmdW5jdGlvbiAobCkge1xuICAgICAgdmFyIG9sZExlbmd0aCA9IHRoaXMubGVuZ3RoKCk7XG4gICAgICBpZiAob2xkTGVuZ3RoICE9PSAwICYmIGwgIT09IG9sZExlbmd0aCkge1xuICAgICAgICB0aGlzLm11bHRTY2FsYXIobCAvIG9sZExlbmd0aCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGxlcnA6IGZ1bmN0aW9uICh2LCBhbHBoYSkge1xuICAgICAgdGhpcy54ICs9ICh2LnggLSB0aGlzLngpICogYWxwaGE7XG4gICAgICB0aGlzLnkgKz0gKHYueSAtIHRoaXMueSkgKiBhbHBoYTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgbGVycFZlY3RvcnM6IGZ1bmN0aW9uICh2MSwgdjIsIGFscGhhKSB7XG4gICAgICB0aGlzLnN1YlZlY3RvcnModjIsIHYxKS5tdWx0aXBseVNjYWxhcihhbHBoYSkuYWRkKHYxKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZXF1YWxzOiBmdW5jdGlvbiAodikge1xuICAgICAgcmV0dXJuICgodi54ID09PSB0aGlzLngpICYmICh2LnkgPT09IHRoaXMueSkpO1xuICAgIH0sXG4gICAgZnJvbUFycmF5OiBmdW5jdGlvbiAoYXJyYXksIG9mZnNldCkge1xuICAgICAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSBvZmZzZXQgPSAwO1xuICAgICAgdGhpcy54ID0gYXJyYXlbIG9mZnNldCBdO1xuICAgICAgdGhpcy55ID0gYXJyYXlbIG9mZnNldCArIDEgXTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgdG9BcnJheTogZnVuY3Rpb24gKGFycmF5LCBvZmZzZXQpIHtcbiAgICAgIGlmIChhcnJheSA9PT0gdW5kZWZpbmVkKSBhcnJheSA9IFtdO1xuICAgICAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSBvZmZzZXQgPSAwO1xuICAgICAgYXJyYXlbIG9mZnNldCBdID0gdGhpcy54O1xuICAgICAgYXJyYXlbIG9mZnNldCArIDEgXSA9IHRoaXMueTtcbiAgICAgIHJldHVybiBhcnJheTtcbiAgICB9LFxuICAgIGZyb21BdHRyaWJ1dGU6IGZ1bmN0aW9uIChhdHRyaWJ1dGUsIGluZGV4LCBvZmZzZXQpIHtcbiAgICAgIGlmIChvZmZzZXQgPT09IHVuZGVmaW5lZCkgb2Zmc2V0ID0gMDtcbiAgICAgIGluZGV4ID0gaW5kZXggKiBhdHRyaWJ1dGUuaXRlbVNpemUgKyBvZmZzZXQ7XG4gICAgICB0aGlzLnggPSBhdHRyaWJ1dGUuYXJyYXlbIGluZGV4IF07XG4gICAgICB0aGlzLnkgPSBhdHRyaWJ1dGUuYXJyYXlbIGluZGV4ICsgMSBdO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIFZlY3RvcjI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMoKTtcbiJdfQ==
