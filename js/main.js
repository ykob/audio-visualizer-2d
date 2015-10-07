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
    var rad = Util.getRadian(i / fft_size * 360);
    var x = Math.cos(rad) + body_width / 2;
    var y = Math.sin(rad) + body_height / 2;
    var position = new Vector2(x, y);
    
    mover.init(position, 20);
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
    var size = Math.pow((256 - spectrums[i * 2]) / 128, 7);

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
    this.r = Util.getRandomInt(0, 32);
    this.g = Util.getRandomInt(0, 192);
    this.b = Util.getRandomInt(32, 255);
    this.a = 0.1;
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
      context.fillStyle = 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a + ')';
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvZGVib3VuY2UuanMiLCJzcmMvanMvZm9yY2UuanMiLCJzcmMvanMvbWFpbi5qcyIsInNyYy9qcy9tb3Zlci5qcyIsInNyYy9qcy91dGlsLmpzIiwic3JjL2pzL3ZlY3RvcjIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvYmplY3QsIGV2ZW50VHlwZSwgY2FsbGJhY2spe1xyXG4gIHZhciB0aW1lcjtcclxuXHJcbiAgb2JqZWN0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCBmdW5jdGlvbihldmVudCkge1xyXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcclxuICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG4gICAgICBjYWxsYmFjayhldmVudCk7XHJcbiAgICB9LCA1MDApO1xyXG4gIH0sIGZhbHNlKTtcclxufTtcclxuIiwidmFyIFZlY3RvcjIgPSByZXF1aXJlKCcuL3ZlY3RvcjInKTtcclxuXHJcbnZhciBleHBvcnRzID0ge1xyXG4gIGZyaWN0aW9uOiBmdW5jdGlvbihhY2NlbGVyYXRpb24sIG11LCBub3JtYWwsIG1hc3MpIHtcclxuICAgIHZhciBmb3JjZSA9IGFjY2VsZXJhdGlvbi5jbG9uZSgpO1xyXG4gICAgaWYgKCFub3JtYWwpIG5vcm1hbCA9IDE7XHJcbiAgICBpZiAoIW1hc3MpIG1hc3MgPSAxO1xyXG4gICAgZm9yY2UubXVsdGlwbHlTY2FsYXIoLTEpO1xyXG4gICAgZm9yY2Uubm9ybWFsaXplKCk7XHJcbiAgICBmb3JjZS5tdWx0aXBseVNjYWxhcihtdSk7XHJcbiAgICByZXR1cm4gZm9yY2U7XHJcbiAgfSxcclxuICBkcmFnOiBmdW5jdGlvbihhY2NlbGVyYXRpb24sIHZhbHVlKSB7XHJcbiAgICB2YXIgZm9yY2UgPSBhY2NlbGVyYXRpb24uY2xvbmUoKTtcclxuICAgIGZvcmNlLm11bHRpcGx5U2NhbGFyKC0xKTtcclxuICAgIGZvcmNlLm5vcm1hbGl6ZSgpO1xyXG4gICAgZm9yY2UubXVsdGlwbHlTY2FsYXIoYWNjZWxlcmF0aW9uLmxlbmd0aCgpICogdmFsdWUpO1xyXG4gICAgcmV0dXJuIGZvcmNlO1xyXG4gIH0sXHJcbiAgaG9vazogZnVuY3Rpb24odmVsb2NpdHksIGFuY2hvciwgcmVzdF9sZW5ndGgsIGspIHtcclxuICAgIHZhciBmb3JjZSA9IHZlbG9jaXR5LmNsb25lKCkuc3ViKGFuY2hvcik7XHJcbiAgICB2YXIgZGlzdGFuY2UgPSBmb3JjZS5sZW5ndGgoKSAtIHJlc3RfbGVuZ3RoO1xyXG4gICAgZm9yY2Uubm9ybWFsaXplKCk7XHJcbiAgICBmb3JjZS5tdWx0aXBseVNjYWxhcigtMSAqIGsgKiBkaXN0YW5jZSk7XHJcbiAgICByZXR1cm4gZm9yY2U7XHJcbiAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzO1xyXG4iLCJ2YXIgVXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xyXG52YXIgVmVjdG9yMiA9IHJlcXVpcmUoJy4vdmVjdG9yMicpO1xyXG52YXIgRm9yY2UgPSByZXF1aXJlKCcuL2ZvcmNlJyk7XHJcbnZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJy4vZGVib3VuY2UnKTtcclxudmFyIE1vdmVyID0gcmVxdWlyZSgnLi9tb3ZlcicpO1xyXG5cclxudmFyIGJvZHkgPSBkb2N1bWVudC5ib2R5O1xyXG52YXIgYm9keV93aWR0aCAgPSBib2R5LmNsaWVudFdpZHRoICogMjtcclxudmFyIGJvZHlfaGVpZ2h0ID0gYm9keS5jbGllbnRIZWlnaHQgKiAyO1xyXG52YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpO1xyXG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcbnZhciBhdWRpb19jdHggPSBuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dCkoKTtcclxudmFyIGF1ZGlvX2FuYWx5c2VyID0gYXVkaW9fY3R4LmNyZWF0ZUFuYWx5c2VyKCk7XHJcbnZhciBhdWRpb19idWZmZXIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuLy92YXIgYXVkaW9fdXJsID0gJ2h0dHBzOi8vYXBpLnNvdW5kY2xvdWQuY29tL3RyYWNrcy84OTI5NzY5OC9zdHJlYW0/Y2xpZW50X2lkPTBhYWY3M2I0ZGUyNGVlNGU4NjMxM2UwMWQ0NTgwODNkJztcclxudmFyIGF1ZGlvX3VybCA9ICdodHRwczovL2FwaS5zb3VuZGNsb3VkLmNvbS90cmFja3MvMTI3MDcwMTg1L3N0cmVhbT9jbGllbnRfaWQ9MGFhZjczYjRkZTI0ZWU0ZTg2MzEzZTAxZDQ1ODA4M2QnO1xyXG52YXIgZmZ0X3NpemUgPSA1MTI7XHJcbnZhciBtb3ZlcnMgPSBbXTtcclxudmFyIGxhc3RfdGltZV94eHggPSBEYXRlLm5vdygpO1xyXG52YXIgdmVjdG9yX3RvdWNoX3N0YXJ0ID0gbmV3IFZlY3RvcjIoKTtcclxudmFyIHZlY3Rvcl90b3VjaF9tb3ZlID0gbmV3IFZlY3RvcjIoKTtcclxudmFyIHZlY3Rvcl90b3VjaF9lbmQgPSBuZXcgVmVjdG9yMigpO1xyXG52YXIgaXNfdG91Y2hlZCA9IGZhbHNlO1xyXG5cclxudmFyIGluaXQgPSBmdW5jdGlvbigpIHtcclxuICBwb29sTW92ZXIoKTtcclxuICBpbml0QXVkaW8oKTtcclxuICBzZXRFdmVudCgpO1xyXG4gIHJlc2l6ZUNhbnZhcygpO1xyXG4gIHJlbmRlcmxvb3AoKTtcclxuICBkZWJvdW5jZSh3aW5kb3csICdyZXNpemUnLCBmdW5jdGlvbihldmVudCl7XHJcbiAgICByZXNpemVDYW52YXMoKTtcclxuICB9KTtcclxufTtcclxuXHJcbnZhciBpbml0QXVkaW8gPSBmdW5jdGlvbigpIHtcclxuICBhdWRpb19hbmFseXNlci5mZnRfc2l6ZSA9IGZmdF9zaXplO1xyXG4gIGF1ZGlvX2FuYWx5c2VyLmNvbm5lY3QoYXVkaW9fY3R4LmRlc3RpbmF0aW9uKTtcclxuICBsb2FkQXVkaW8oKTtcclxufTtcclxuXHJcbnZhciBsb2FkQXVkaW8gPSBmdW5jdGlvbigpIHtcclxuICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG4gIFxyXG4gIHJlcXVlc3Qub3BlbignR0VUJywgYXVkaW9fdXJsLCB0cnVlKTtcclxuICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XHJcbiAgcmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbigpIHtcclxuICAgIGF1ZGlvX2N0eC5kZWNvZGVBdWRpb0RhdGEocmVxdWVzdC5yZXNwb25zZSwgZnVuY3Rpb24oYnVmZmVyKSB7XHJcbiAgICAgIGF1ZGlvX2J1ZmZlciA9IGJ1ZmZlcjtcclxuICAgICAgcGxheUF1ZGlvKCk7XHJcbiAgICB9KTtcclxuICB9O1xyXG4gIHJlcXVlc3Quc2VuZCgpO1xyXG59O1xyXG5cclxudmFyIHBsYXlBdWRpbyA9IGZ1bmN0aW9uKCkge1xyXG4gIHZhciBzb3VyY2UgPSBhdWRpb19jdHguY3JlYXRlQnVmZmVyU291cmNlKCk7XHJcbiAgXHJcbiAgc291cmNlLmJ1ZmZlciA9IGF1ZGlvX2J1ZmZlcjtcclxuICBzb3VyY2UuY29ubmVjdChhdWRpb19hbmFseXNlcik7XHJcbiAgc291cmNlLmxvb3AgPSB0cnVlO1xyXG4gIHNvdXJjZS5sb29wU3RhcnQgPSAwO1xyXG4gIHNvdXJjZS5sb29wRW5kID0gYXVkaW9fYnVmZmVyLmR1cmF0aW9uO1xyXG4gIHNvdXJjZS5wbGF5YmFja1JhdGUudmFsdWUgPSAxLjA7XHJcbiAgc291cmNlLnN0YXJ0KDApO1xyXG59O1xyXG5cclxudmFyIHBvb2xNb3ZlciA9IGZ1bmN0aW9uKCkge1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZmZ0X3NpemU7IGkrKykge1xyXG4gICAgdmFyIG1vdmVyID0gbmV3IE1vdmVyKCk7XHJcbiAgICB2YXIgcmFkID0gVXRpbC5nZXRSYWRpYW4oaSAvIGZmdF9zaXplICogMzYwKTtcclxuICAgIHZhciB4ID0gTWF0aC5jb3MocmFkKSArIGJvZHlfd2lkdGggLyAyO1xyXG4gICAgdmFyIHkgPSBNYXRoLnNpbihyYWQpICsgYm9keV9oZWlnaHQgLyAyO1xyXG4gICAgdmFyIHBvc2l0aW9uID0gbmV3IFZlY3RvcjIoeCwgeSk7XHJcbiAgICBcclxuICAgIG1vdmVyLmluaXQocG9zaXRpb24sIDIwKTtcclxuICAgIG1vdmVycy5wdXNoKG1vdmVyKTtcclxuICB9XHJcbn07XHJcblxyXG52YXIgdXBkYXRlTW92ZXIgPSBmdW5jdGlvbigpIHtcclxuICB2YXIgc3BlY3RydW1zID0gbmV3IFVpbnQ4QXJyYXkoYXVkaW9fYW5hbHlzZXIuZnJlcXVlbmN5QmluQ291bnQpO1xyXG4gIHZhciBzdHIgPSAnJztcclxuICB2YXIgbGVuZ3RoID0gMDtcclxuICBcclxuICBhdWRpb19hbmFseXNlci5nZXRCeXRlVGltZURvbWFpbkRhdGEoc3BlY3RydW1zKTtcclxuICBzcGVjdHJ1bV9sZW5ndGggPSBhdWRpb19hbmFseXNlci5mcmVxdWVuY3lCaW5Db3VudDtcclxuICBcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IG1vdmVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIG1vdmVyID0gbW92ZXJzW2ldO1xyXG4gICAgdmFyIHJhZCA9IFV0aWwuZ2V0UmFkaWFuKGkgLyBtb3ZlcnMubGVuZ3RoICogMzYwKTtcclxuICAgIHZhciByID0gYm9keV9oZWlnaHQgLyAzO1xyXG4gICAgdmFyIHggPSBNYXRoLmNvcyhyYWQpICogciArIGJvZHlfd2lkdGggLyAyO1xyXG4gICAgdmFyIHkgPSBNYXRoLnNpbihyYWQpICogciArIGJvZHlfaGVpZ2h0IC8gMjtcclxuICAgIHZhciBzaXplID0gTWF0aC5wb3coKDI1NiAtIHNwZWN0cnVtc1tpICogMl0pIC8gMTI4LCA3KTtcclxuXHJcbiAgICBtb3Zlci5yYWRpdXMgPSBzaXplO1xyXG4gICAgbW92ZXIudmVsb2NpdHkuc2V0KHgsIHkpO1xyXG4gICAgbW92ZXIudXBkYXRlVmVsb2NpdHkoKTtcclxuICAgIG1vdmVyLnVwZGF0ZVBvc2l0aW9uKCk7XHJcbiAgICBtb3Zlci5kcmF3KGN0eCk7XHJcbiAgfVxyXG59O1xyXG5cclxudmFyIHJlbmRlciA9IGZ1bmN0aW9uKCkge1xyXG4gIGN0eC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSAnbGlnaHRlcic7XHJcbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCBib2R5X3dpZHRoLCBib2R5X2hlaWdodCk7XHJcbiAgdXBkYXRlTW92ZXIoKTtcclxufTtcclxuXHJcbnZhciByZW5kZXJsb29wID0gZnVuY3Rpb24oKSB7XHJcbiAgdmFyIG5vdyA9IERhdGUubm93KCk7XHJcbiAgXHJcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlcmxvb3ApO1xyXG4gIHJlbmRlcigpO1xyXG4gIC8vIGlmIChub3cgLSBsYXN0X3RpbWVfeHh4ID4gMTAwMCkge1xyXG4gIC8vICAgZnVuY3Rpb25fbmFtZSgpO1xyXG4gIC8vICAgbGFzdF90aW1lX3h4eCA9IERhdGUubm93KCk7XHJcbiAgLy8gfVxyXG59O1xyXG5cclxudmFyIHJlc2l6ZUNhbnZhcyA9IGZ1bmN0aW9uKCkge1xyXG4gIGJvZHlfd2lkdGggID0gYm9keS5jbGllbnRXaWR0aCAqIDI7XHJcbiAgYm9keV9oZWlnaHQgPSBib2R5LmNsaWVudEhlaWdodCAqIDI7XHJcblxyXG4gIGNhbnZhcy53aWR0aCA9IGJvZHlfd2lkdGg7XHJcbiAgY2FudmFzLmhlaWdodCA9IGJvZHlfaGVpZ2h0O1xyXG4gIGNhbnZhcy5zdHlsZS53aWR0aCA9IGJvZHlfd2lkdGggLyAyICsgJ3B4JztcclxuICBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gYm9keV9oZWlnaHQgLyAyICsgJ3B4JztcclxufTtcclxuXHJcbnZhciBzZXRFdmVudCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgZXZlbnRUb3VjaFN0YXJ0ID0gZnVuY3Rpb24oeCwgeSkge1xyXG4gICAgdmVjdG9yX3RvdWNoX3N0YXJ0LnNldCh4LCB5KTtcclxuICAgIGlzX3RvdWNoZWQgPSB0cnVlO1xyXG4gIH07XHJcbiAgXHJcbiAgdmFyIGV2ZW50VG91Y2hNb3ZlID0gZnVuY3Rpb24oeCwgeSkge1xyXG4gICAgdmVjdG9yX3RvdWNoX21vdmUuc2V0KHgsIHkpO1xyXG4gICAgaWYgKGlzX3RvdWNoZWQpIHtcclxuICAgICAgXHJcbiAgICB9XHJcbiAgfTtcclxuICBcclxuICB2YXIgZXZlbnRUb3VjaEVuZCA9IGZ1bmN0aW9uKHgsIHkpIHtcclxuICAgIHZlY3Rvcl90b3VjaF9lbmQuc2V0KHgsIHkpO1xyXG4gICAgaXNfdG91Y2hlZCA9IGZhbHNlO1xyXG4gIH07XHJcblxyXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdjb250ZXh0bWVudScsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICB9KTtcclxuXHJcbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3NlbGVjdHN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gIH0pO1xyXG5cclxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgZXZlbnRUb3VjaFN0YXJ0KGV2ZW50LmNsaWVudFggKiAyLCBldmVudC5jbGllbnRZICogMik7XHJcbiAgfSk7XHJcblxyXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBldmVudFRvdWNoTW92ZShldmVudC5jbGllbnRYICogMiwgZXZlbnQuY2xpZW50WSAqIDIpO1xyXG4gIH0pO1xyXG5cclxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIGV2ZW50VG91Y2hFbmQoKTtcclxuICB9KTtcclxuXHJcbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBldmVudFRvdWNoU3RhcnQoZXZlbnQudG91Y2hlc1swXS5jbGllbnRYICogMiwgZXZlbnQudG91Y2hlc1swXS5jbGllbnRZICogMik7XHJcbiAgfSk7XHJcblxyXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBldmVudFRvdWNoTW92ZShldmVudC50b3VjaGVzWzBdLmNsaWVudFggKiAyLCBldmVudC50b3VjaGVzWzBdLmNsaWVudFkgKiAyKTtcclxuICB9KTtcclxuXHJcbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgZXZlbnRUb3VjaEVuZCgpO1xyXG4gIH0pO1xyXG59O1xyXG5cclxuaW5pdCgpO1xyXG4iLCJ2YXIgVXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xyXG52YXIgVmVjdG9yMiA9IHJlcXVpcmUoJy4vdmVjdG9yMicpO1xyXG52YXIgRm9yY2UgPSByZXF1aXJlKCcuL2ZvcmNlJyk7XHJcblxyXG52YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCl7XHJcbiAgdmFyIE1vdmVyID0gZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLnBvc2l0aW9uID0gbmV3IFZlY3RvcjIoKTtcclxuICAgIHRoaXMudmVsb2NpdHkgPSBuZXcgVmVjdG9yMigpO1xyXG4gICAgdGhpcy5hY2NlbGVyYXRpb24gPSBuZXcgVmVjdG9yMigpO1xyXG4gICAgdGhpcy5hbmNob3IgPSBuZXcgVmVjdG9yMigpO1xyXG4gICAgdGhpcy5yYWRpdXMgPSAwO1xyXG4gICAgdGhpcy5tYXNzID0gMTtcclxuICAgIHRoaXMuZGlyZWN0aW9uID0gMDtcclxuICAgIHRoaXMuciA9IFV0aWwuZ2V0UmFuZG9tSW50KDAsIDMyKTtcclxuICAgIHRoaXMuZyA9IFV0aWwuZ2V0UmFuZG9tSW50KDAsIDE5Mik7XHJcbiAgICB0aGlzLmIgPSBVdGlsLmdldFJhbmRvbUludCgzMiwgMjU1KTtcclxuICAgIHRoaXMuYSA9IDAuMTtcclxuICAgIHRoaXMudGltZSA9IDA7XHJcbiAgICB0aGlzLmlzX2FjdGl2ZSA9IGZhbHNlO1xyXG4gIH07XHJcbiAgXHJcbiAgTW92ZXIucHJvdG90eXBlID0ge1xyXG4gICAgaW5pdDogZnVuY3Rpb24odmVjdG9yLCBzaXplKSB7XHJcbiAgICAgIHRoaXMucmFkaXVzID0gc2l6ZTtcclxuICAgICAgdGhpcy5tYXNzID0gdGhpcy5yYWRpdXMgLyAxMDA7XHJcbiAgICAgIHRoaXMucG9zaXRpb24gPSB2ZWN0b3IuY2xvbmUoKTtcclxuICAgICAgdGhpcy52ZWxvY2l0eSA9IHZlY3Rvci5jbG9uZSgpO1xyXG4gICAgICB0aGlzLmFuY2hvciA9IHZlY3Rvci5jbG9uZSgpO1xyXG4gICAgICB0aGlzLmFjY2VsZXJhdGlvbi5zZXQoMCwgMCk7XHJcbiAgICAgIHRoaXMuYSA9IDE7XHJcbiAgICAgIHRoaXMudGltZSA9IDA7XHJcbiAgICB9LFxyXG4gICAgdXBkYXRlUG9zaXRpb246IGZ1bmN0aW9uKCkge1xyXG4gICAgICB0aGlzLnBvc2l0aW9uLmNvcHkodGhpcy52ZWxvY2l0eSk7XHJcbiAgICB9LFxyXG4gICAgdXBkYXRlVmVsb2NpdHk6IGZ1bmN0aW9uKCkge1xyXG4gICAgICB0aGlzLnZlbG9jaXR5LmFkZCh0aGlzLmFjY2VsZXJhdGlvbik7XHJcbiAgICAgIGlmICh0aGlzLnZlbG9jaXR5LmRpc3RhbmNlVG8odGhpcy5wb3NpdGlvbikgPj0gMSkge1xyXG4gICAgICAgIHRoaXMuZGlyZWN0KHRoaXMudmVsb2NpdHkpO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgYXBwbHlGb3JjZTogZnVuY3Rpb24odmVjdG9yKSB7XHJcbiAgICAgIHRoaXMuYWNjZWxlcmF0aW9uLmFkZCh2ZWN0b3IpO1xyXG4gICAgfSxcclxuICAgIGFwcGx5RnJpY3Rpb246IGZ1bmN0aW9uKCkge1xyXG4gICAgICB2YXIgZnJpY3Rpb24gPSBGb3JjZS5mcmljdGlvbih0aGlzLmFjY2VsZXJhdGlvbiwgMC4xKTtcclxuICAgICAgdGhpcy5hcHBseUZvcmNlKGZyaWN0aW9uKTtcclxuICAgIH0sXHJcbiAgICBhcHBseURyYWdGb3JjZTogZnVuY3Rpb24odmFsdWUpIHtcclxuICAgICAgdmFyIGRyYWcgPSBGb3JjZS5kcmFnKHRoaXMuYWNjZWxlcmF0aW9uLCB2YWx1ZSk7XHJcbiAgICAgIHRoaXMuYXBwbHlGb3JjZShkcmFnKTtcclxuICAgIH0sXHJcbiAgICBob29rOiBmdW5jdGlvbihyZXN0X2xlbmd0aCwgaykge1xyXG4gICAgICB2YXIgZm9yY2UgPSBGb3JjZS5ob29rKHRoaXMudmVsb2NpdHksIHRoaXMuYW5jaG9yLCByZXN0X2xlbmd0aCwgayk7XHJcbiAgICAgIHRoaXMuYXBwbHlGb3JjZShmb3JjZSk7XHJcbiAgICB9LFxyXG4gICAgZGlyZWN0OiBmdW5jdGlvbih2ZWN0b3IpIHtcclxuICAgICAgdmFyIHYgPSB2ZWN0b3IuY2xvbmUoKS5zdWIodGhpcy5wb3NpdGlvbik7XHJcbiAgICAgIHRoaXMuZGlyZWN0aW9uID0gTWF0aC5hdGFuMih2LnksIHYueCk7XHJcbiAgICB9LFxyXG4gICAgZHJhdzogZnVuY3Rpb24oY29udGV4dCkge1xyXG4gICAgICBjb250ZXh0LmZpbGxTdHlsZSA9ICdyZ2JhKCcgKyB0aGlzLnIgKyAnLCcgKyB0aGlzLmcgKyAnLCcgKyB0aGlzLmIgKyAnLCcgKyB0aGlzLmEgKyAnKSc7XHJcbiAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XHJcbiAgICAgIGNvbnRleHQuYXJjKHRoaXMucG9zaXRpb24ueCwgdGhpcy5wb3NpdGlvbi55LCB0aGlzLnJhZGl1cywgMCwgTWF0aC5QSSAvIDE4MCwgdHJ1ZSk7XHJcbiAgICAgIGNvbnRleHQuZmlsbCgpO1xyXG4gICAgfSxcclxuICAgIGFjdGl2YXRlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHRoaXMuaXNfYWN0aXZlID0gdHJ1ZTtcclxuICAgIH0sXHJcbiAgICBpbmFjdGl2YXRlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHRoaXMuaXNfYWN0aXZlID0gZmFsc2U7XHJcbiAgICB9XHJcbiAgfTtcclxuICBcclxuICByZXR1cm4gTW92ZXI7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMoKTtcclxuIiwidmFyIGV4cG9ydHMgPSB7XHJcbiAgZ2V0UmFuZG9tSW50OiBmdW5jdGlvbihtaW4sIG1heCl7XHJcbiAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikpICsgbWluO1xyXG4gIH0sXHJcbiAgZ2V0RGVncmVlOiBmdW5jdGlvbihyYWRpYW4pIHtcclxuICAgIHJldHVybiByYWRpYW4gLyBNYXRoLlBJICogMTgwO1xyXG4gIH0sXHJcbiAgZ2V0UmFkaWFuOiBmdW5jdGlvbihkZWdyZWVzKSB7XHJcbiAgICByZXR1cm4gZGVncmVlcyAqIE1hdGguUEkgLyAxODA7XHJcbiAgfSxcclxuICBnZXRTcGhlcmljYWw6IGZ1bmN0aW9uKHJhZDEsIHJhZDIsIHIpIHtcclxuICAgIHZhciB4ID0gTWF0aC5jb3MocmFkMSkgKiBNYXRoLmNvcyhyYWQyKSAqIHI7XHJcbiAgICB2YXIgeiA9IE1hdGguY29zKHJhZDEpICogTWF0aC5zaW4ocmFkMikgKiByO1xyXG4gICAgdmFyIHkgPSBNYXRoLnNpbihyYWQxKSAqIHI7XHJcbiAgICByZXR1cm4gW3gsIHksIHpdO1xyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cztcclxuIiwiLy8gXHJcbi8vIOOBk+OBrlZlY3RvcjLjgq/jg6njgrnjga/jgIF0aHJlZS5qc+OBrlRIUkVFLlZlY3RvcjLjgq/jg6njgrnjga7oqIjnrpflvI/jga7kuIDpg6jjgpLliKnnlKjjgZfjgabjgYTjgb7jgZnjgIJcclxuLy8gaHR0cHM6Ly9naXRodWIuY29tL21yZG9vYi90aHJlZS5qcy9ibG9iL21hc3Rlci9zcmMvbWF0aC9WZWN0b3IyLmpzI0wzNjdcclxuLy8gXHJcblxyXG52YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCl7XHJcbiAgdmFyIFZlY3RvcjIgPSBmdW5jdGlvbih4LCB5KSB7XHJcbiAgICB0aGlzLnggPSB4IHx8IDA7XHJcbiAgICB0aGlzLnkgPSB5IHx8IDA7XHJcbiAgfTtcclxuICBcclxuICBWZWN0b3IyLnByb3RvdHlwZSA9IHtcclxuICAgIHNldDogZnVuY3Rpb24gKHgsIHkpIHtcclxuICAgICAgdGhpcy54ID0geDtcclxuICAgICAgdGhpcy55ID0geTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIG5ldyBWZWN0b3IyKHRoaXMueCwgdGhpcy55KTtcclxuICAgIH0sXHJcbiAgICBjb3B5OiBmdW5jdGlvbiAodikge1xyXG4gICAgICB0aGlzLnggPSB2Lng7XHJcbiAgICAgIHRoaXMueSA9IHYueTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgYWRkOiBmdW5jdGlvbiAodikge1xyXG4gICAgICB0aGlzLnggKz0gdi54O1xyXG4gICAgICB0aGlzLnkgKz0gdi55O1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBhZGRTY2FsYXI6IGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgIHRoaXMueCArPSBzO1xyXG4gICAgICB0aGlzLnkgKz0gcztcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgc3ViOiBmdW5jdGlvbiAodikge1xyXG4gICAgICB0aGlzLnggLT0gdi54O1xyXG4gICAgICB0aGlzLnkgLT0gdi55O1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBzdWJTY2FsYXI6IGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgIHRoaXMueCAtPSBzO1xyXG4gICAgICB0aGlzLnkgLT0gcztcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgbXVsdGlwbHk6IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIHRoaXMueCAqPSB2Lng7XHJcbiAgICAgIHRoaXMueSAqPSB2Lnk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIG11bHRpcGx5U2NhbGFyOiBmdW5jdGlvbiAocykge1xyXG4gICAgICB0aGlzLnggKj0gcztcclxuICAgICAgdGhpcy55ICo9IHM7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGRpdmlkZTogZnVuY3Rpb24gKHYpIHtcclxuICAgICAgdGhpcy54IC89IHYueDtcclxuICAgICAgdGhpcy55IC89IHYueTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgZGl2aWRlU2NhbGFyOiBmdW5jdGlvbiAocykge1xyXG4gICAgICBpZiAodGhpcy54ICE9PSAwICYmIHMgIT09IDApIHRoaXMueCAvPSBzO1xyXG4gICAgICBpZiAodGhpcy55ICE9PSAwICYmIHMgIT09IDApIHRoaXMueSAvPSBzO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBtaW46IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIGlmICh0aGlzLnggPCB2LngpIHRoaXMueCA9IHYueDtcclxuICAgICAgaWYgKHRoaXMueSA8IHYueSkgdGhpcy55ID0gdi55O1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBtYXg6IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIGlmICh0aGlzLnggPiB2LngpIHRoaXMueCA9IHYueDtcclxuICAgICAgaWYgKHRoaXMueSA+IHYueSkgdGhpcy55ID0gdi55O1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBjbGFtcDogZnVuY3Rpb24gKHZfbWluLCB2X21heCkge1xyXG4gICAgICBpZiAodGhpcy54IDwgdl9taW4ueCkge1xyXG4gICAgICAgIHRoaXMueCA9IHZfbWluLng7XHJcbiAgICAgIH0gZWxzZSBpZiAodGhpcy54ID4gdl9tYXgueCkge1xyXG4gICAgICAgIHRoaXMueCA9IHZfbWF4Lng7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKHRoaXMueSA8IHZfbWluLnkpIHtcclxuICAgICAgICB0aGlzLnkgPSB2X21pbi55O1xyXG4gICAgICB9IGVsc2UgaWYgKHRoaXMueSA+IHZfbWF4LnkpIHtcclxuICAgICAgICB0aGlzLnkgPSB2X21heC55O1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGNsYW1wU2NhbGFyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBtaW4sIG1heDtcclxuICAgICAgcmV0dXJuIGZ1bmN0aW9uIGNsYW1wU2NhbGFyKG1pblZhbCwgbWF4VmFsKSB7XHJcbiAgICAgICAgaWYgKG1pbiA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICBtaW4gPSBuZXcgVmVjdG9yMigpO1xyXG4gICAgICAgICAgbWF4ID0gbmV3IFZlY3RvcjIoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbWluLnNldChtaW5WYWwsIG1pblZhbCk7XHJcbiAgICAgICAgbWF4LnNldChtYXhWYWwsIG1heFZhbCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY2xhbXAobWluLCBtYXgpO1xyXG4gICAgICB9O1xyXG4gICAgfSgpLFxyXG4gICAgZmxvb3I6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdGhpcy54ID0gTWF0aC5mbG9vcih0aGlzLngpO1xyXG4gICAgICB0aGlzLnkgPSBNYXRoLmZsb29yKHRoaXMueSk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGNlaWw6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdGhpcy54ID0gTWF0aC5jZWlsKHRoaXMueCk7XHJcbiAgICAgIHRoaXMueSA9IE1hdGguY2VpbCh0aGlzLnkpO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICByb3VuZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnggPSBNYXRoLnJvdW5kKHRoaXMueCk7XHJcbiAgICAgIHRoaXMueSA9IE1hdGgucm91bmQodGhpcy55KTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgcm91bmRUb1plcm86IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdGhpcy54ID0gKHRoaXMueCA8IDApID8gTWF0aC5jZWlsKHRoaXMueCkgOiBNYXRoLmZsb29yKHRoaXMueCk7XHJcbiAgICAgIHRoaXMueSA9ICh0aGlzLnkgPCAwKSA/IE1hdGguY2VpbCh0aGlzLnkpIDogTWF0aC5mbG9vcih0aGlzLnkpO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBuZWdhdGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdGhpcy54ID0gLSB0aGlzLng7XHJcbiAgICAgIHRoaXMueSA9IC0gdGhpcy55O1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBkb3Q6IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIHJldHVybiB0aGlzLnggKiB2LnggKyB0aGlzLnkgKiB2Lnk7XHJcbiAgICB9LFxyXG4gICAgbGVuZ3RoU3E6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueTtcclxuICAgIH0sXHJcbiAgICBsZW5ndGg6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLmxlbmd0aFNxKCkpO1xyXG4gICAgfSxcclxuICAgIGxlbmd0aE1hbmhhdHRhbjogZnVuY3Rpb24oKSB7XHJcbiAgICAgIHJldHVybiBNYXRoLmFicyh0aGlzLngpICsgTWF0aC5hYnModGhpcy55KTtcclxuICAgIH0sXHJcbiAgICBub3JtYWxpemU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuZGl2aWRlU2NhbGFyKHRoaXMubGVuZ3RoKCkpO1xyXG4gICAgfSxcclxuICAgIGRpc3RhbmNlVG86IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIHZhciBkeCA9IHRoaXMueCAtIHYueDtcclxuICAgICAgdmFyIGR5ID0gdGhpcy55IC0gdi55O1xyXG4gICAgICByZXR1cm4gTWF0aC5zcXJ0KGR4ICogZHggKyBkeSAqIGR5KTtcclxuICAgIH0sXHJcbiAgICBkaXN0YW5jZVRvU3F1YXJlZDogZnVuY3Rpb24gKHYpIHtcclxuICAgICAgdmFyIGR4ID0gdGhpcy54IC0gdi54LCBkeSA9IHRoaXMueSAtIHYueTtcclxuICAgICAgcmV0dXJuIGR4ICogZHggKyBkeSAqIGR5O1xyXG4gICAgfSxcclxuICAgIHNldExlbmd0aDogZnVuY3Rpb24gKGwpIHtcclxuICAgICAgdmFyIG9sZExlbmd0aCA9IHRoaXMubGVuZ3RoKCk7XHJcbiAgICAgIGlmIChvbGRMZW5ndGggIT09IDAgJiYgbCAhPT0gb2xkTGVuZ3RoKSB7XHJcbiAgICAgICAgdGhpcy5tdWx0U2NhbGFyKGwgLyBvbGRMZW5ndGgpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGxlcnA6IGZ1bmN0aW9uICh2LCBhbHBoYSkge1xyXG4gICAgICB0aGlzLnggKz0gKHYueCAtIHRoaXMueCkgKiBhbHBoYTtcclxuICAgICAgdGhpcy55ICs9ICh2LnkgLSB0aGlzLnkpICogYWxwaGE7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGxlcnBWZWN0b3JzOiBmdW5jdGlvbiAodjEsIHYyLCBhbHBoYSkge1xyXG4gICAgICB0aGlzLnN1YlZlY3RvcnModjIsIHYxKS5tdWx0aXBseVNjYWxhcihhbHBoYSkuYWRkKHYxKTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgZXF1YWxzOiBmdW5jdGlvbiAodikge1xyXG4gICAgICByZXR1cm4gKCh2LnggPT09IHRoaXMueCkgJiYgKHYueSA9PT0gdGhpcy55KSk7XHJcbiAgICB9LFxyXG4gICAgZnJvbUFycmF5OiBmdW5jdGlvbiAoYXJyYXksIG9mZnNldCkge1xyXG4gICAgICBpZiAob2Zmc2V0ID09PSB1bmRlZmluZWQpIG9mZnNldCA9IDA7XHJcbiAgICAgIHRoaXMueCA9IGFycmF5WyBvZmZzZXQgXTtcclxuICAgICAgdGhpcy55ID0gYXJyYXlbIG9mZnNldCArIDEgXTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgdG9BcnJheTogZnVuY3Rpb24gKGFycmF5LCBvZmZzZXQpIHtcclxuICAgICAgaWYgKGFycmF5ID09PSB1bmRlZmluZWQpIGFycmF5ID0gW107XHJcbiAgICAgIGlmIChvZmZzZXQgPT09IHVuZGVmaW5lZCkgb2Zmc2V0ID0gMDtcclxuICAgICAgYXJyYXlbIG9mZnNldCBdID0gdGhpcy54O1xyXG4gICAgICBhcnJheVsgb2Zmc2V0ICsgMSBdID0gdGhpcy55O1xyXG4gICAgICByZXR1cm4gYXJyYXk7XHJcbiAgICB9LFxyXG4gICAgZnJvbUF0dHJpYnV0ZTogZnVuY3Rpb24gKGF0dHJpYnV0ZSwgaW5kZXgsIG9mZnNldCkge1xyXG4gICAgICBpZiAob2Zmc2V0ID09PSB1bmRlZmluZWQpIG9mZnNldCA9IDA7XHJcbiAgICAgIGluZGV4ID0gaW5kZXggKiBhdHRyaWJ1dGUuaXRlbVNpemUgKyBvZmZzZXQ7XHJcbiAgICAgIHRoaXMueCA9IGF0dHJpYnV0ZS5hcnJheVsgaW5kZXggXTtcclxuICAgICAgdGhpcy55ID0gYXR0cmlidXRlLmFycmF5WyBpbmRleCArIDEgXTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gVmVjdG9yMjtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cygpO1xyXG4iXX0=
