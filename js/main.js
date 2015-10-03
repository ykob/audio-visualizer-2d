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
var audio_url = 'https://api.soundcloud.com/tracks/89297698/stream?client_id=0aaf73b4de24ee4e86313e01d458083d';
var fft_size = 512;
var log = document.getElementById('log');
var last_time_xxx = Date.now();
var vector_touch_start = new Vector2();
var vector_touch_move = new Vector2();
var vector_touch_end = new Vector2();
var is_touched = false;

var init = function() {
  renderloop();
  setEvent();
  resizeCanvas();
  initAudio();
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
  source.start(0);
};

var drawSpectrums = function() {
  var spectrums = new Uint8Array(audio_analyser.frequencyBinCount);
  var str = '';
  var length = 0;
  
  audio_analyser.getByteTimeDomainData(spectrums);
  length = audio_analyser.frequencyBinCount;
  ctx.fillStyle = 'rgba(0, 210, 200, 1)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (var i = 0; i < length; i++) {
    var x = i / fft_size * body_width;
    //var y = spectrums[i] / 256 * body_height;
    var y = (Math.log(256 - spectrums[i]) / Math.log(256)) * body_height * 0.9;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.lineTo(body_width, body_height);
  ctx.lineTo(0, body_height);
  ctx.fill();
};

var render = function() {
  ctx.clearRect(0, 0, body_width, body_height);
  drawSpectrums();
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
    this.r = 0;
    this.g = 0;
    this.b = 0;
    this.a = 1;
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvZGVib3VuY2UuanMiLCJzcmMvanMvZm9yY2UuanMiLCJzcmMvanMvbWFpbi5qcyIsInNyYy9qcy9tb3Zlci5qcyIsInNyYy9qcy91dGlsLmpzIiwic3JjL2pzL3ZlY3RvcjIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvYmplY3QsIGV2ZW50VHlwZSwgY2FsbGJhY2spe1xuICB2YXIgdGltZXI7XG5cbiAgb2JqZWN0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCBmdW5jdGlvbihldmVudCkge1xuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICBjYWxsYmFjayhldmVudCk7XG4gICAgfSwgNTAwKTtcbiAgfSwgZmFsc2UpO1xufTtcbiIsInZhciBWZWN0b3IyID0gcmVxdWlyZSgnLi92ZWN0b3IyJyk7XG5cbnZhciBleHBvcnRzID0ge1xuICBmcmljdGlvbjogZnVuY3Rpb24oYWNjZWxlcmF0aW9uLCBtdSwgbm9ybWFsLCBtYXNzKSB7XG4gICAgdmFyIGZvcmNlID0gYWNjZWxlcmF0aW9uLmNsb25lKCk7XG4gICAgaWYgKCFub3JtYWwpIG5vcm1hbCA9IDE7XG4gICAgaWYgKCFtYXNzKSBtYXNzID0gMTtcbiAgICBmb3JjZS5tdWx0aXBseVNjYWxhcigtMSk7XG4gICAgZm9yY2Uubm9ybWFsaXplKCk7XG4gICAgZm9yY2UubXVsdGlwbHlTY2FsYXIobXUpO1xuICAgIHJldHVybiBmb3JjZTtcbiAgfSxcbiAgZHJhZzogZnVuY3Rpb24oYWNjZWxlcmF0aW9uLCB2YWx1ZSkge1xuICAgIHZhciBmb3JjZSA9IGFjY2VsZXJhdGlvbi5jbG9uZSgpO1xuICAgIGZvcmNlLm11bHRpcGx5U2NhbGFyKC0xKTtcbiAgICBmb3JjZS5ub3JtYWxpemUoKTtcbiAgICBmb3JjZS5tdWx0aXBseVNjYWxhcihhY2NlbGVyYXRpb24ubGVuZ3RoKCkgKiB2YWx1ZSk7XG4gICAgcmV0dXJuIGZvcmNlO1xuICB9LFxuICBob29rOiBmdW5jdGlvbih2ZWxvY2l0eSwgYW5jaG9yLCByZXN0X2xlbmd0aCwgaykge1xuICAgIHZhciBmb3JjZSA9IHZlbG9jaXR5LmNsb25lKCkuc3ViKGFuY2hvcik7XG4gICAgdmFyIGRpc3RhbmNlID0gZm9yY2UubGVuZ3RoKCkgLSByZXN0X2xlbmd0aDtcbiAgICBmb3JjZS5ub3JtYWxpemUoKTtcbiAgICBmb3JjZS5tdWx0aXBseVNjYWxhcigtMSAqIGsgKiBkaXN0YW5jZSk7XG4gICAgcmV0dXJuIGZvcmNlO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHM7XG4iLCJ2YXIgVXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIFZlY3RvcjIgPSByZXF1aXJlKCcuL3ZlY3RvcjInKTtcbnZhciBGb3JjZSA9IHJlcXVpcmUoJy4vZm9yY2UnKTtcbnZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJy4vZGVib3VuY2UnKTtcbnZhciBNb3ZlciA9IHJlcXVpcmUoJy4vbW92ZXInKTtcblxudmFyIGJvZHkgPSBkb2N1bWVudC5ib2R5O1xudmFyIGJvZHlfd2lkdGggID0gYm9keS5jbGllbnRXaWR0aCAqIDI7XG52YXIgYm9keV9oZWlnaHQgPSBib2R5LmNsaWVudEhlaWdodCAqIDI7XG52YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpO1xudmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xudmFyIGF1ZGlvX2N0eCA9IG5ldyAod2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0KSgpO1xudmFyIGF1ZGlvX2FuYWx5c2VyID0gYXVkaW9fY3R4LmNyZWF0ZUFuYWx5c2VyKCk7XG52YXIgYXVkaW9fYnVmZmVyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG52YXIgYXVkaW9fdXJsID0gJ2h0dHBzOi8vYXBpLnNvdW5kY2xvdWQuY29tL3RyYWNrcy84OTI5NzY5OC9zdHJlYW0/Y2xpZW50X2lkPTBhYWY3M2I0ZGUyNGVlNGU4NjMxM2UwMWQ0NTgwODNkJztcbnZhciBmZnRfc2l6ZSA9IDUxMjtcbnZhciBsb2cgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9nJyk7XG52YXIgbGFzdF90aW1lX3h4eCA9IERhdGUubm93KCk7XG52YXIgdmVjdG9yX3RvdWNoX3N0YXJ0ID0gbmV3IFZlY3RvcjIoKTtcbnZhciB2ZWN0b3JfdG91Y2hfbW92ZSA9IG5ldyBWZWN0b3IyKCk7XG52YXIgdmVjdG9yX3RvdWNoX2VuZCA9IG5ldyBWZWN0b3IyKCk7XG52YXIgaXNfdG91Y2hlZCA9IGZhbHNlO1xuXG52YXIgaW5pdCA9IGZ1bmN0aW9uKCkge1xuICByZW5kZXJsb29wKCk7XG4gIHNldEV2ZW50KCk7XG4gIHJlc2l6ZUNhbnZhcygpO1xuICBpbml0QXVkaW8oKTtcbiAgZGVib3VuY2Uod2luZG93LCAncmVzaXplJywgZnVuY3Rpb24oZXZlbnQpe1xuICAgIHJlc2l6ZUNhbnZhcygpO1xuICB9KTtcbn07XG5cbnZhciBpbml0QXVkaW8gPSBmdW5jdGlvbigpIHtcbiAgYXVkaW9fYW5hbHlzZXIuZmZ0X3NpemUgPSBmZnRfc2l6ZTtcbiAgYXVkaW9fYW5hbHlzZXIuY29ubmVjdChhdWRpb19jdHguZGVzdGluYXRpb24pO1xuICBsb2FkQXVkaW8oKTtcbn07XG5cbnZhciBsb2FkQXVkaW8gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgXG4gIHJlcXVlc3Qub3BlbignR0VUJywgYXVkaW9fdXJsLCB0cnVlKTtcbiAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgIGF1ZGlvX2N0eC5kZWNvZGVBdWRpb0RhdGEocmVxdWVzdC5yZXNwb25zZSwgZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICBhdWRpb19idWZmZXIgPSBidWZmZXI7XG4gICAgICBwbGF5QXVkaW8oKTtcbiAgICB9KTtcbiAgfTtcbiAgcmVxdWVzdC5zZW5kKCk7XG59O1xuXG52YXIgcGxheUF1ZGlvID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzb3VyY2UgPSBhdWRpb19jdHguY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gIFxuICBzb3VyY2UuYnVmZmVyID0gYXVkaW9fYnVmZmVyO1xuICBzb3VyY2UuY29ubmVjdChhdWRpb19hbmFseXNlcik7XG4gIHNvdXJjZS5zdGFydCgwKTtcbn07XG5cbnZhciBkcmF3U3BlY3RydW1zID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzcGVjdHJ1bXMgPSBuZXcgVWludDhBcnJheShhdWRpb19hbmFseXNlci5mcmVxdWVuY3lCaW5Db3VudCk7XG4gIHZhciBzdHIgPSAnJztcbiAgdmFyIGxlbmd0aCA9IDA7XG4gIFxuICBhdWRpb19hbmFseXNlci5nZXRCeXRlVGltZURvbWFpbkRhdGEoc3BlY3RydW1zKTtcbiAgbGVuZ3RoID0gYXVkaW9fYW5hbHlzZXIuZnJlcXVlbmN5QmluQ291bnQ7XG4gIGN0eC5maWxsU3R5bGUgPSAncmdiYSgwLCAyMTAsIDIwMCwgMSknO1xuICBjdHgubGluZVdpZHRoID0gNDtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHggPSBpIC8gZmZ0X3NpemUgKiBib2R5X3dpZHRoO1xuICAgIC8vdmFyIHkgPSBzcGVjdHJ1bXNbaV0gLyAyNTYgKiBib2R5X2hlaWdodDtcbiAgICB2YXIgeSA9IChNYXRoLmxvZygyNTYgLSBzcGVjdHJ1bXNbaV0pIC8gTWF0aC5sb2coMjU2KSkgKiBib2R5X2hlaWdodCAqIDAuOTtcbiAgICBcbiAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgY3R4Lm1vdmVUbyh4LCB5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY3R4LmxpbmVUbyh4LCB5KTtcbiAgICB9XG4gIH1cbiAgY3R4LmxpbmVUbyhib2R5X3dpZHRoLCBib2R5X2hlaWdodCk7XG4gIGN0eC5saW5lVG8oMCwgYm9keV9oZWlnaHQpO1xuICBjdHguZmlsbCgpO1xufTtcblxudmFyIHJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICBjdHguY2xlYXJSZWN0KDAsIDAsIGJvZHlfd2lkdGgsIGJvZHlfaGVpZ2h0KTtcbiAgZHJhd1NwZWN0cnVtcygpO1xufTtcblxudmFyIHJlbmRlcmxvb3AgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gIFxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUocmVuZGVybG9vcCk7XG4gIHJlbmRlcigpO1xuICAvLyBpZiAobm93IC0gbGFzdF90aW1lX3h4eCA+IDEwMDApIHtcbiAgLy8gICBmdW5jdGlvbl9uYW1lKCk7XG4gIC8vICAgbGFzdF90aW1lX3h4eCA9IERhdGUubm93KCk7XG4gIC8vIH1cbn07XG5cbnZhciByZXNpemVDYW52YXMgPSBmdW5jdGlvbigpIHtcbiAgYm9keV93aWR0aCAgPSBib2R5LmNsaWVudFdpZHRoICogMjtcbiAgYm9keV9oZWlnaHQgPSBib2R5LmNsaWVudEhlaWdodCAqIDI7XG5cbiAgY2FudmFzLndpZHRoID0gYm9keV93aWR0aDtcbiAgY2FudmFzLmhlaWdodCA9IGJvZHlfaGVpZ2h0O1xuICBjYW52YXMuc3R5bGUud2lkdGggPSBib2R5X3dpZHRoIC8gMiArICdweCc7XG4gIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBib2R5X2hlaWdodCAvIDIgKyAncHgnO1xufTtcblxudmFyIHNldEV2ZW50ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZXZlbnRUb3VjaFN0YXJ0ID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHZlY3Rvcl90b3VjaF9zdGFydC5zZXQoeCwgeSk7XG4gICAgaXNfdG91Y2hlZCA9IHRydWU7XG4gIH07XG4gIFxuICB2YXIgZXZlbnRUb3VjaE1vdmUgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgdmVjdG9yX3RvdWNoX21vdmUuc2V0KHgsIHkpO1xuICAgIGlmIChpc190b3VjaGVkKSB7XG4gICAgICBcbiAgICB9XG4gIH07XG4gIFxuICB2YXIgZXZlbnRUb3VjaEVuZCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB2ZWN0b3JfdG91Y2hfZW5kLnNldCh4LCB5KTtcbiAgICBpc190b3VjaGVkID0gZmFsc2U7XG4gIH07XG5cbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgfSk7XG5cbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3NlbGVjdHN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgfSk7XG5cbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnRUb3VjaFN0YXJ0KGV2ZW50LmNsaWVudFggKiAyLCBldmVudC5jbGllbnRZICogMik7XG4gIH0pO1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50VG91Y2hNb3ZlKGV2ZW50LmNsaWVudFggKiAyLCBldmVudC5jbGllbnRZICogMik7XG4gIH0pO1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudFRvdWNoRW5kKCk7XG4gIH0pO1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudFRvdWNoU3RhcnQoZXZlbnQudG91Y2hlc1swXS5jbGllbnRYICogMiwgZXZlbnQudG91Y2hlc1swXS5jbGllbnRZICogMik7XG4gIH0pO1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50VG91Y2hNb3ZlKGV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WCAqIDIsIGV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WSAqIDIpO1xuICB9KTtcblxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50VG91Y2hFbmQoKTtcbiAgfSk7XG59O1xuXG5pbml0KCk7XG4iLCJ2YXIgVXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIFZlY3RvcjIgPSByZXF1aXJlKCcuL3ZlY3RvcjInKTtcbnZhciBGb3JjZSA9IHJlcXVpcmUoJy4vZm9yY2UnKTtcblxudmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpe1xuICB2YXIgTW92ZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnBvc2l0aW9uID0gbmV3IFZlY3RvcjIoKTtcbiAgICB0aGlzLnZlbG9jaXR5ID0gbmV3IFZlY3RvcjIoKTtcbiAgICB0aGlzLmFjY2VsZXJhdGlvbiA9IG5ldyBWZWN0b3IyKCk7XG4gICAgdGhpcy5hbmNob3IgPSBuZXcgVmVjdG9yMigpO1xuICAgIHRoaXMucmFkaXVzID0gMDtcbiAgICB0aGlzLm1hc3MgPSAxO1xuICAgIHRoaXMuZGlyZWN0aW9uID0gMDtcbiAgICB0aGlzLnIgPSAwO1xuICAgIHRoaXMuZyA9IDA7XG4gICAgdGhpcy5iID0gMDtcbiAgICB0aGlzLmEgPSAxO1xuICAgIHRoaXMudGltZSA9IDA7XG4gICAgdGhpcy5pc19hY3RpdmUgPSBmYWxzZTtcbiAgfTtcbiAgXG4gIE1vdmVyLnByb3RvdHlwZSA9IHtcbiAgICBpbml0OiBmdW5jdGlvbih2ZWN0b3IsIHNpemUpIHtcbiAgICAgIHRoaXMucmFkaXVzID0gc2l6ZTtcbiAgICAgIHRoaXMubWFzcyA9IHRoaXMucmFkaXVzIC8gMTAwO1xuICAgICAgdGhpcy5wb3NpdGlvbiA9IHZlY3Rvci5jbG9uZSgpO1xuICAgICAgdGhpcy52ZWxvY2l0eSA9IHZlY3Rvci5jbG9uZSgpO1xuICAgICAgdGhpcy5hbmNob3IgPSB2ZWN0b3IuY2xvbmUoKTtcbiAgICAgIHRoaXMuYWNjZWxlcmF0aW9uLnNldCgwLCAwKTtcbiAgICAgIHRoaXMuYSA9IDE7XG4gICAgICB0aGlzLnRpbWUgPSAwO1xuICAgIH0sXG4gICAgdXBkYXRlUG9zaXRpb246IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5wb3NpdGlvbi5jb3B5KHRoaXMudmVsb2NpdHkpO1xuICAgIH0sXG4gICAgdXBkYXRlVmVsb2NpdHk6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy52ZWxvY2l0eS5hZGQodGhpcy5hY2NlbGVyYXRpb24pO1xuICAgICAgaWYgKHRoaXMudmVsb2NpdHkuZGlzdGFuY2VUbyh0aGlzLnBvc2l0aW9uKSA+PSAxKSB7XG4gICAgICAgIHRoaXMuZGlyZWN0KHRoaXMudmVsb2NpdHkpO1xuICAgICAgfVxuICAgIH0sXG4gICAgYXBwbHlGb3JjZTogZnVuY3Rpb24odmVjdG9yKSB7XG4gICAgICB0aGlzLmFjY2VsZXJhdGlvbi5hZGQodmVjdG9yKTtcbiAgICB9LFxuICAgIGFwcGx5RnJpY3Rpb246IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGZyaWN0aW9uID0gRm9yY2UuZnJpY3Rpb24odGhpcy5hY2NlbGVyYXRpb24sIDAuMSk7XG4gICAgICB0aGlzLmFwcGx5Rm9yY2UoZnJpY3Rpb24pO1xuICAgIH0sXG4gICAgYXBwbHlEcmFnRm9yY2U6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB2YXIgZHJhZyA9IEZvcmNlLmRyYWcodGhpcy5hY2NlbGVyYXRpb24sIHZhbHVlKTtcbiAgICAgIHRoaXMuYXBwbHlGb3JjZShkcmFnKTtcbiAgICB9LFxuICAgIGhvb2s6IGZ1bmN0aW9uKHJlc3RfbGVuZ3RoLCBrKSB7XG4gICAgICB2YXIgZm9yY2UgPSBGb3JjZS5ob29rKHRoaXMudmVsb2NpdHksIHRoaXMuYW5jaG9yLCByZXN0X2xlbmd0aCwgayk7XG4gICAgICB0aGlzLmFwcGx5Rm9yY2UoZm9yY2UpO1xuICAgIH0sXG4gICAgZGlyZWN0OiBmdW5jdGlvbih2ZWN0b3IpIHtcbiAgICAgIHZhciB2ID0gdmVjdG9yLmNsb25lKCkuc3ViKHRoaXMucG9zaXRpb24pO1xuICAgICAgdGhpcy5kaXJlY3Rpb24gPSBNYXRoLmF0YW4yKHYueSwgdi54KTtcbiAgICB9LFxuICAgIGRyYXc6IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gJ3JnYmEoJyArIHRoaXMuciArICcsJyArIHRoaXMuZyArICcsJyArIHRoaXMuYiArICcsJyArIHRoaXMuYSArICcpJztcbiAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICBjb250ZXh0LmFyYyh0aGlzLnBvc2l0aW9uLngsIHRoaXMucG9zaXRpb24ueSwgdGhpcy5yYWRpdXMsIDAsIE1hdGguUEkgLyAxODAsIHRydWUpO1xuICAgICAgY29udGV4dC5maWxsKCk7XG4gICAgfSxcbiAgICBhY3RpdmF0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5pc19hY3RpdmUgPSB0cnVlO1xuICAgIH0sXG4gICAgaW5hY3RpdmF0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5pc19hY3RpdmUgPSBmYWxzZTtcbiAgICB9XG4gIH07XG4gIFxuICByZXR1cm4gTW92ZXI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMoKTtcbiIsInZhciBleHBvcnRzID0ge1xuICBnZXRSYW5kb21JbnQ6IGZ1bmN0aW9uKG1pbiwgbWF4KXtcbiAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikpICsgbWluO1xuICB9LFxuICBnZXREZWdyZWU6IGZ1bmN0aW9uKHJhZGlhbikge1xuICAgIHJldHVybiByYWRpYW4gLyBNYXRoLlBJICogMTgwO1xuICB9LFxuICBnZXRSYWRpYW46IGZ1bmN0aW9uKGRlZ3JlZXMpIHtcbiAgICByZXR1cm4gZGVncmVlcyAqIE1hdGguUEkgLyAxODA7XG4gIH0sXG4gIGdldFNwaGVyaWNhbDogZnVuY3Rpb24ocmFkMSwgcmFkMiwgcikge1xuICAgIHZhciB4ID0gTWF0aC5jb3MocmFkMSkgKiBNYXRoLmNvcyhyYWQyKSAqIHI7XG4gICAgdmFyIHogPSBNYXRoLmNvcyhyYWQxKSAqIE1hdGguc2luKHJhZDIpICogcjtcbiAgICB2YXIgeSA9IE1hdGguc2luKHJhZDEpICogcjtcbiAgICByZXR1cm4gW3gsIHksIHpdO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHM7XG4iLCIvLyBcbi8vIOOBk+OBrlZlY3RvcjLjgq/jg6njgrnjga/jgIF0aHJlZS5qc+OBrlRIUkVFLlZlY3RvcjLjgq/jg6njgrnjga7oqIjnrpflvI/jga7kuIDpg6jjgpLliKnnlKjjgZfjgabjgYTjgb7jgZnjgIJcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tcmRvb2IvdGhyZWUuanMvYmxvYi9tYXN0ZXIvc3JjL21hdGgvVmVjdG9yMi5qcyNMMzY3XG4vLyBcblxudmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpe1xuICB2YXIgVmVjdG9yMiA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB0aGlzLnggPSB4IHx8IDA7XG4gICAgdGhpcy55ID0geSB8fCAwO1xuICB9O1xuICBcbiAgVmVjdG9yMi5wcm90b3R5cGUgPSB7XG4gICAgc2V0OiBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgdGhpcy54ID0geDtcbiAgICAgIHRoaXMueSA9IHk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGNsb25lOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbmV3IFZlY3RvcjIodGhpcy54LCB0aGlzLnkpO1xuICAgIH0sXG4gICAgY29weTogZnVuY3Rpb24gKHYpIHtcbiAgICAgIHRoaXMueCA9IHYueDtcbiAgICAgIHRoaXMueSA9IHYueTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgYWRkOiBmdW5jdGlvbiAodikge1xuICAgICAgdGhpcy54ICs9IHYueDtcbiAgICAgIHRoaXMueSArPSB2Lnk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGFkZFNjYWxhcjogZnVuY3Rpb24gKHMpIHtcbiAgICAgIHRoaXMueCArPSBzO1xuICAgICAgdGhpcy55ICs9IHM7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHN1YjogZnVuY3Rpb24gKHYpIHtcbiAgICAgIHRoaXMueCAtPSB2Lng7XG4gICAgICB0aGlzLnkgLT0gdi55O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBzdWJTY2FsYXI6IGZ1bmN0aW9uIChzKSB7XG4gICAgICB0aGlzLnggLT0gcztcbiAgICAgIHRoaXMueSAtPSBzO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBtdWx0aXBseTogZnVuY3Rpb24gKHYpIHtcbiAgICAgIHRoaXMueCAqPSB2Lng7XG4gICAgICB0aGlzLnkgKj0gdi55O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBtdWx0aXBseVNjYWxhcjogZnVuY3Rpb24gKHMpIHtcbiAgICAgIHRoaXMueCAqPSBzO1xuICAgICAgdGhpcy55ICo9IHM7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGRpdmlkZTogZnVuY3Rpb24gKHYpIHtcbiAgICAgIHRoaXMueCAvPSB2Lng7XG4gICAgICB0aGlzLnkgLz0gdi55O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBkaXZpZGVTY2FsYXI6IGZ1bmN0aW9uIChzKSB7XG4gICAgICBpZiAodGhpcy54ICE9PSAwICYmIHMgIT09IDApIHRoaXMueCAvPSBzO1xuICAgICAgaWYgKHRoaXMueSAhPT0gMCAmJiBzICE9PSAwKSB0aGlzLnkgLz0gcztcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgbWluOiBmdW5jdGlvbiAodikge1xuICAgICAgaWYgKHRoaXMueCA8IHYueCkgdGhpcy54ID0gdi54O1xuICAgICAgaWYgKHRoaXMueSA8IHYueSkgdGhpcy55ID0gdi55O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBtYXg6IGZ1bmN0aW9uICh2KSB7XG4gICAgICBpZiAodGhpcy54ID4gdi54KSB0aGlzLnggPSB2Lng7XG4gICAgICBpZiAodGhpcy55ID4gdi55KSB0aGlzLnkgPSB2Lnk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGNsYW1wOiBmdW5jdGlvbiAodl9taW4sIHZfbWF4KSB7XG4gICAgICBpZiAodGhpcy54IDwgdl9taW4ueCkge1xuICAgICAgICB0aGlzLnggPSB2X21pbi54O1xuICAgICAgfSBlbHNlIGlmICh0aGlzLnggPiB2X21heC54KSB7XG4gICAgICAgIHRoaXMueCA9IHZfbWF4Lng7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy55IDwgdl9taW4ueSkge1xuICAgICAgICB0aGlzLnkgPSB2X21pbi55O1xuICAgICAgfSBlbHNlIGlmICh0aGlzLnkgPiB2X21heC55KSB7XG4gICAgICAgIHRoaXMueSA9IHZfbWF4Lnk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGNsYW1wU2NhbGFyOiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgbWluLCBtYXg7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gY2xhbXBTY2FsYXIobWluVmFsLCBtYXhWYWwpIHtcbiAgICAgICAgaWYgKG1pbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgbWluID0gbmV3IFZlY3RvcjIoKTtcbiAgICAgICAgICBtYXggPSBuZXcgVmVjdG9yMigpO1xuICAgICAgICB9XG4gICAgICAgIG1pbi5zZXQobWluVmFsLCBtaW5WYWwpO1xuICAgICAgICBtYXguc2V0KG1heFZhbCwgbWF4VmFsKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2xhbXAobWluLCBtYXgpO1xuICAgICAgfTtcbiAgICB9KCksXG4gICAgZmxvb3I6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMueCA9IE1hdGguZmxvb3IodGhpcy54KTtcbiAgICAgIHRoaXMueSA9IE1hdGguZmxvb3IodGhpcy55KTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgY2VpbDogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy54ID0gTWF0aC5jZWlsKHRoaXMueCk7XG4gICAgICB0aGlzLnkgPSBNYXRoLmNlaWwodGhpcy55KTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgcm91bmQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMueCA9IE1hdGgucm91bmQodGhpcy54KTtcbiAgICAgIHRoaXMueSA9IE1hdGgucm91bmQodGhpcy55KTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgcm91bmRUb1plcm86IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMueCA9ICh0aGlzLnggPCAwKSA/IE1hdGguY2VpbCh0aGlzLngpIDogTWF0aC5mbG9vcih0aGlzLngpO1xuICAgICAgdGhpcy55ID0gKHRoaXMueSA8IDApID8gTWF0aC5jZWlsKHRoaXMueSkgOiBNYXRoLmZsb29yKHRoaXMueSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIG5lZ2F0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy54ID0gLSB0aGlzLng7XG4gICAgICB0aGlzLnkgPSAtIHRoaXMueTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZG90OiBmdW5jdGlvbiAodikge1xuICAgICAgcmV0dXJuIHRoaXMueCAqIHYueCArIHRoaXMueSAqIHYueTtcbiAgICB9LFxuICAgIGxlbmd0aFNxOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gdGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55O1xuICAgIH0sXG4gICAgbGVuZ3RoOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMubGVuZ3RoU3EoKSk7XG4gICAgfSxcbiAgICBsZW5ndGhNYW5oYXR0YW46IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIE1hdGguYWJzKHRoaXMueCkgKyBNYXRoLmFicyh0aGlzLnkpO1xuICAgIH0sXG4gICAgbm9ybWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gdGhpcy5kaXZpZGVTY2FsYXIodGhpcy5sZW5ndGgoKSk7XG4gICAgfSxcbiAgICBkaXN0YW5jZVRvOiBmdW5jdGlvbiAodikge1xuICAgICAgdmFyIGR4ID0gdGhpcy54IC0gdi54O1xuICAgICAgdmFyIGR5ID0gdGhpcy55IC0gdi55O1xuICAgICAgcmV0dXJuIE1hdGguc3FydChkeCAqIGR4ICsgZHkgKiBkeSk7XG4gICAgfSxcbiAgICBkaXN0YW5jZVRvU3F1YXJlZDogZnVuY3Rpb24gKHYpIHtcbiAgICAgIHZhciBkeCA9IHRoaXMueCAtIHYueCwgZHkgPSB0aGlzLnkgLSB2Lnk7XG4gICAgICByZXR1cm4gZHggKiBkeCArIGR5ICogZHk7XG4gICAgfSxcbiAgICBzZXRMZW5ndGg6IGZ1bmN0aW9uIChsKSB7XG4gICAgICB2YXIgb2xkTGVuZ3RoID0gdGhpcy5sZW5ndGgoKTtcbiAgICAgIGlmIChvbGRMZW5ndGggIT09IDAgJiYgbCAhPT0gb2xkTGVuZ3RoKSB7XG4gICAgICAgIHRoaXMubXVsdFNjYWxhcihsIC8gb2xkTGVuZ3RoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgbGVycDogZnVuY3Rpb24gKHYsIGFscGhhKSB7XG4gICAgICB0aGlzLnggKz0gKHYueCAtIHRoaXMueCkgKiBhbHBoYTtcbiAgICAgIHRoaXMueSArPSAodi55IC0gdGhpcy55KSAqIGFscGhhO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBsZXJwVmVjdG9yczogZnVuY3Rpb24gKHYxLCB2MiwgYWxwaGEpIHtcbiAgICAgIHRoaXMuc3ViVmVjdG9ycyh2MiwgdjEpLm11bHRpcGx5U2NhbGFyKGFscGhhKS5hZGQodjEpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBlcXVhbHM6IGZ1bmN0aW9uICh2KSB7XG4gICAgICByZXR1cm4gKCh2LnggPT09IHRoaXMueCkgJiYgKHYueSA9PT0gdGhpcy55KSk7XG4gICAgfSxcbiAgICBmcm9tQXJyYXk6IGZ1bmN0aW9uIChhcnJheSwgb2Zmc2V0KSB7XG4gICAgICBpZiAob2Zmc2V0ID09PSB1bmRlZmluZWQpIG9mZnNldCA9IDA7XG4gICAgICB0aGlzLnggPSBhcnJheVsgb2Zmc2V0IF07XG4gICAgICB0aGlzLnkgPSBhcnJheVsgb2Zmc2V0ICsgMSBdO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICB0b0FycmF5OiBmdW5jdGlvbiAoYXJyYXksIG9mZnNldCkge1xuICAgICAgaWYgKGFycmF5ID09PSB1bmRlZmluZWQpIGFycmF5ID0gW107XG4gICAgICBpZiAob2Zmc2V0ID09PSB1bmRlZmluZWQpIG9mZnNldCA9IDA7XG4gICAgICBhcnJheVsgb2Zmc2V0IF0gPSB0aGlzLng7XG4gICAgICBhcnJheVsgb2Zmc2V0ICsgMSBdID0gdGhpcy55O1xuICAgICAgcmV0dXJuIGFycmF5O1xuICAgIH0sXG4gICAgZnJvbUF0dHJpYnV0ZTogZnVuY3Rpb24gKGF0dHJpYnV0ZSwgaW5kZXgsIG9mZnNldCkge1xuICAgICAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSBvZmZzZXQgPSAwO1xuICAgICAgaW5kZXggPSBpbmRleCAqIGF0dHJpYnV0ZS5pdGVtU2l6ZSArIG9mZnNldDtcbiAgICAgIHRoaXMueCA9IGF0dHJpYnV0ZS5hcnJheVsgaW5kZXggXTtcbiAgICAgIHRoaXMueSA9IGF0dHJpYnV0ZS5hcnJheVsgaW5kZXggKyAxIF07XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gVmVjdG9yMjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cygpO1xuIl19
