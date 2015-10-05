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
var gravity = new Vector2(0, 0.5);
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvZGVib3VuY2UuanMiLCJzcmMvanMvZm9yY2UuanMiLCJzcmMvanMvbWFpbi5qcyIsInNyYy9qcy9tb3Zlci5qcyIsInNyYy9qcy91dGlsLmpzIiwic3JjL2pzL3ZlY3RvcjIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvYmplY3QsIGV2ZW50VHlwZSwgY2FsbGJhY2spe1xyXG4gIHZhciB0aW1lcjtcclxuXHJcbiAgb2JqZWN0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCBmdW5jdGlvbihldmVudCkge1xyXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcclxuICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG4gICAgICBjYWxsYmFjayhldmVudCk7XHJcbiAgICB9LCA1MDApO1xyXG4gIH0sIGZhbHNlKTtcclxufTtcclxuIiwidmFyIFZlY3RvcjIgPSByZXF1aXJlKCcuL3ZlY3RvcjInKTtcclxuXHJcbnZhciBleHBvcnRzID0ge1xyXG4gIGZyaWN0aW9uOiBmdW5jdGlvbihhY2NlbGVyYXRpb24sIG11LCBub3JtYWwsIG1hc3MpIHtcclxuICAgIHZhciBmb3JjZSA9IGFjY2VsZXJhdGlvbi5jbG9uZSgpO1xyXG4gICAgaWYgKCFub3JtYWwpIG5vcm1hbCA9IDE7XHJcbiAgICBpZiAoIW1hc3MpIG1hc3MgPSAxO1xyXG4gICAgZm9yY2UubXVsdGlwbHlTY2FsYXIoLTEpO1xyXG4gICAgZm9yY2Uubm9ybWFsaXplKCk7XHJcbiAgICBmb3JjZS5tdWx0aXBseVNjYWxhcihtdSk7XHJcbiAgICByZXR1cm4gZm9yY2U7XHJcbiAgfSxcclxuICBkcmFnOiBmdW5jdGlvbihhY2NlbGVyYXRpb24sIHZhbHVlKSB7XHJcbiAgICB2YXIgZm9yY2UgPSBhY2NlbGVyYXRpb24uY2xvbmUoKTtcclxuICAgIGZvcmNlLm11bHRpcGx5U2NhbGFyKC0xKTtcclxuICAgIGZvcmNlLm5vcm1hbGl6ZSgpO1xyXG4gICAgZm9yY2UubXVsdGlwbHlTY2FsYXIoYWNjZWxlcmF0aW9uLmxlbmd0aCgpICogdmFsdWUpO1xyXG4gICAgcmV0dXJuIGZvcmNlO1xyXG4gIH0sXHJcbiAgaG9vazogZnVuY3Rpb24odmVsb2NpdHksIGFuY2hvciwgcmVzdF9sZW5ndGgsIGspIHtcclxuICAgIHZhciBmb3JjZSA9IHZlbG9jaXR5LmNsb25lKCkuc3ViKGFuY2hvcik7XHJcbiAgICB2YXIgZGlzdGFuY2UgPSBmb3JjZS5sZW5ndGgoKSAtIHJlc3RfbGVuZ3RoO1xyXG4gICAgZm9yY2Uubm9ybWFsaXplKCk7XHJcbiAgICBmb3JjZS5tdWx0aXBseVNjYWxhcigtMSAqIGsgKiBkaXN0YW5jZSk7XHJcbiAgICByZXR1cm4gZm9yY2U7XHJcbiAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzO1xyXG4iLCJ2YXIgVXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xyXG52YXIgVmVjdG9yMiA9IHJlcXVpcmUoJy4vdmVjdG9yMicpO1xyXG52YXIgRm9yY2UgPSByZXF1aXJlKCcuL2ZvcmNlJyk7XHJcbnZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJy4vZGVib3VuY2UnKTtcclxudmFyIE1vdmVyID0gcmVxdWlyZSgnLi9tb3ZlcicpO1xyXG5cclxudmFyIGJvZHkgPSBkb2N1bWVudC5ib2R5O1xyXG52YXIgYm9keV93aWR0aCAgPSBib2R5LmNsaWVudFdpZHRoICogMjtcclxudmFyIGJvZHlfaGVpZ2h0ID0gYm9keS5jbGllbnRIZWlnaHQgKiAyO1xyXG52YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpO1xyXG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcbnZhciBhdWRpb19jdHggPSBuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dCkoKTtcclxudmFyIGF1ZGlvX2FuYWx5c2VyID0gYXVkaW9fY3R4LmNyZWF0ZUFuYWx5c2VyKCk7XHJcbnZhciBhdWRpb19idWZmZXIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuLy92YXIgYXVkaW9fdXJsID0gJ2h0dHBzOi8vYXBpLnNvdW5kY2xvdWQuY29tL3RyYWNrcy84OTI5NzY5OC9zdHJlYW0/Y2xpZW50X2lkPTBhYWY3M2I0ZGUyNGVlNGU4NjMxM2UwMWQ0NTgwODNkJztcclxudmFyIGF1ZGlvX3VybCA9ICdodHRwczovL2FwaS5zb3VuZGNsb3VkLmNvbS90cmFja3MvMTI3MDcwMTg1L3N0cmVhbT9jbGllbnRfaWQ9MGFhZjczYjRkZTI0ZWU0ZTg2MzEzZTAxZDQ1ODA4M2QnO1xyXG52YXIgZmZ0X3NpemUgPSA1MTI7XHJcbnZhciBtb3ZlcnMgPSBbXTtcclxudmFyIGdyYXZpdHkgPSBuZXcgVmVjdG9yMigwLCAwLjUpO1xyXG52YXIgbGFzdF90aW1lX3h4eCA9IERhdGUubm93KCk7XHJcbnZhciB2ZWN0b3JfdG91Y2hfc3RhcnQgPSBuZXcgVmVjdG9yMigpO1xyXG52YXIgdmVjdG9yX3RvdWNoX21vdmUgPSBuZXcgVmVjdG9yMigpO1xyXG52YXIgdmVjdG9yX3RvdWNoX2VuZCA9IG5ldyBWZWN0b3IyKCk7XHJcbnZhciBpc190b3VjaGVkID0gZmFsc2U7XHJcblxyXG52YXIgaW5pdCA9IGZ1bmN0aW9uKCkge1xyXG4gIHBvb2xNb3ZlcigpO1xyXG4gIGluaXRBdWRpbygpO1xyXG4gIHNldEV2ZW50KCk7XHJcbiAgcmVzaXplQ2FudmFzKCk7XHJcbiAgcmVuZGVybG9vcCgpO1xyXG4gIGRlYm91bmNlKHdpbmRvdywgJ3Jlc2l6ZScsIGZ1bmN0aW9uKGV2ZW50KXtcclxuICAgIHJlc2l6ZUNhbnZhcygpO1xyXG4gIH0pO1xyXG59O1xyXG5cclxudmFyIGluaXRBdWRpbyA9IGZ1bmN0aW9uKCkge1xyXG4gIGF1ZGlvX2FuYWx5c2VyLmZmdF9zaXplID0gZmZ0X3NpemU7XHJcbiAgYXVkaW9fYW5hbHlzZXIuY29ubmVjdChhdWRpb19jdHguZGVzdGluYXRpb24pO1xyXG4gIGxvYWRBdWRpbygpO1xyXG59O1xyXG5cclxudmFyIGxvYWRBdWRpbyA9IGZ1bmN0aW9uKCkge1xyXG4gIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcbiAgXHJcbiAgcmVxdWVzdC5vcGVuKCdHRVQnLCBhdWRpb191cmwsIHRydWUpO1xyXG4gIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcclxuICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgYXVkaW9fY3R4LmRlY29kZUF1ZGlvRGF0YShyZXF1ZXN0LnJlc3BvbnNlLCBmdW5jdGlvbihidWZmZXIpIHtcclxuICAgICAgYXVkaW9fYnVmZmVyID0gYnVmZmVyO1xyXG4gICAgICBwbGF5QXVkaW8oKTtcclxuICAgIH0pO1xyXG4gIH07XHJcbiAgcmVxdWVzdC5zZW5kKCk7XHJcbn07XHJcblxyXG52YXIgcGxheUF1ZGlvID0gZnVuY3Rpb24oKSB7XHJcbiAgdmFyIHNvdXJjZSA9IGF1ZGlvX2N0eC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcclxuICBcclxuICBzb3VyY2UuYnVmZmVyID0gYXVkaW9fYnVmZmVyO1xyXG4gIHNvdXJjZS5jb25uZWN0KGF1ZGlvX2FuYWx5c2VyKTtcclxuICBzb3VyY2Uuc3RhcnQoMCk7XHJcbn07XHJcblxyXG52YXIgcG9vbE1vdmVyID0gZnVuY3Rpb24oKSB7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBmZnRfc2l6ZTsgaSsrKSB7XHJcbiAgICB2YXIgbW92ZXIgPSBuZXcgTW92ZXIoKTtcclxuICAgIHZhciByYWQgPSBVdGlsLmdldFJhZGlhbihpIC8gZmZ0X3NpemUgKiAzNjApO1xyXG4gICAgdmFyIHggPSBNYXRoLmNvcyhyYWQpICsgYm9keV93aWR0aCAvIDI7XHJcbiAgICB2YXIgeSA9IE1hdGguc2luKHJhZCkgKyBib2R5X2hlaWdodCAvIDI7XHJcbiAgICB2YXIgcG9zaXRpb24gPSBuZXcgVmVjdG9yMih4LCB5KTtcclxuICAgIFxyXG4gICAgbW92ZXIuaW5pdChwb3NpdGlvbiwgMjApO1xyXG4gICAgbW92ZXJzLnB1c2gobW92ZXIpO1xyXG4gIH1cclxufTtcclxuXHJcbnZhciB1cGRhdGVNb3ZlciA9IGZ1bmN0aW9uKCkge1xyXG4gIHZhciBzcGVjdHJ1bXMgPSBuZXcgVWludDhBcnJheShhdWRpb19hbmFseXNlci5mcmVxdWVuY3lCaW5Db3VudCk7XHJcbiAgdmFyIHN0ciA9ICcnO1xyXG4gIHZhciBsZW5ndGggPSAwO1xyXG4gIFxyXG4gIGF1ZGlvX2FuYWx5c2VyLmdldEJ5dGVUaW1lRG9tYWluRGF0YShzcGVjdHJ1bXMpO1xyXG4gIHNwZWN0cnVtX2xlbmd0aCA9IGF1ZGlvX2FuYWx5c2VyLmZyZXF1ZW5jeUJpbkNvdW50O1xyXG4gIFxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbW92ZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgbW92ZXIgPSBtb3ZlcnNbaV07XHJcbiAgICB2YXIgcmFkID0gVXRpbC5nZXRSYWRpYW4oaSAvIG1vdmVycy5sZW5ndGggKiAzNjApO1xyXG4gICAgdmFyIHIgPSBib2R5X2hlaWdodCAvIDM7XHJcbiAgICB2YXIgeCA9IE1hdGguY29zKHJhZCkgKiByICsgYm9keV93aWR0aCAvIDI7XHJcbiAgICB2YXIgeSA9IE1hdGguc2luKHJhZCkgKiByICsgYm9keV9oZWlnaHQgLyAyO1xyXG4gICAgdmFyIHNpemUgPSBNYXRoLnBvdygoMjU2IC0gc3BlY3RydW1zW2kgKiAyXSkgLyAxMjgsIDcpO1xyXG5cclxuICAgIG1vdmVyLnJhZGl1cyA9IHNpemU7XHJcbiAgICBtb3Zlci52ZWxvY2l0eS5zZXQoeCwgeSk7XHJcbiAgICBtb3Zlci51cGRhdGVWZWxvY2l0eSgpO1xyXG4gICAgbW92ZXIudXBkYXRlUG9zaXRpb24oKTtcclxuICAgIG1vdmVyLmRyYXcoY3R4KTtcclxuICB9XHJcbn07XHJcblxyXG52YXIgcmVuZGVyID0gZnVuY3Rpb24oKSB7XHJcbiAgY3R4Lmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9ICdsaWdodGVyJztcclxuICBjdHguY2xlYXJSZWN0KDAsIDAsIGJvZHlfd2lkdGgsIGJvZHlfaGVpZ2h0KTtcclxuICB1cGRhdGVNb3ZlcigpO1xyXG59O1xyXG5cclxudmFyIHJlbmRlcmxvb3AgPSBmdW5jdGlvbigpIHtcclxuICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcclxuICBcclxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUocmVuZGVybG9vcCk7XHJcbiAgcmVuZGVyKCk7XHJcbiAgLy8gaWYgKG5vdyAtIGxhc3RfdGltZV94eHggPiAxMDAwKSB7XHJcbiAgLy8gICBmdW5jdGlvbl9uYW1lKCk7XHJcbiAgLy8gICBsYXN0X3RpbWVfeHh4ID0gRGF0ZS5ub3coKTtcclxuICAvLyB9XHJcbn07XHJcblxyXG52YXIgcmVzaXplQ2FudmFzID0gZnVuY3Rpb24oKSB7XHJcbiAgYm9keV93aWR0aCAgPSBib2R5LmNsaWVudFdpZHRoICogMjtcclxuICBib2R5X2hlaWdodCA9IGJvZHkuY2xpZW50SGVpZ2h0ICogMjtcclxuXHJcbiAgY2FudmFzLndpZHRoID0gYm9keV93aWR0aDtcclxuICBjYW52YXMuaGVpZ2h0ID0gYm9keV9oZWlnaHQ7XHJcbiAgY2FudmFzLnN0eWxlLndpZHRoID0gYm9keV93aWR0aCAvIDIgKyAncHgnO1xyXG4gIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBib2R5X2hlaWdodCAvIDIgKyAncHgnO1xyXG59O1xyXG5cclxudmFyIHNldEV2ZW50ID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBldmVudFRvdWNoU3RhcnQgPSBmdW5jdGlvbih4LCB5KSB7XHJcbiAgICB2ZWN0b3JfdG91Y2hfc3RhcnQuc2V0KHgsIHkpO1xyXG4gICAgaXNfdG91Y2hlZCA9IHRydWU7XHJcbiAgfTtcclxuICBcclxuICB2YXIgZXZlbnRUb3VjaE1vdmUgPSBmdW5jdGlvbih4LCB5KSB7XHJcbiAgICB2ZWN0b3JfdG91Y2hfbW92ZS5zZXQoeCwgeSk7XHJcbiAgICBpZiAoaXNfdG91Y2hlZCkge1xyXG4gICAgICBcclxuICAgIH1cclxuICB9O1xyXG4gIFxyXG4gIHZhciBldmVudFRvdWNoRW5kID0gZnVuY3Rpb24oeCwgeSkge1xyXG4gICAgdmVjdG9yX3RvdWNoX2VuZC5zZXQoeCwgeSk7XHJcbiAgICBpc190b3VjaGVkID0gZmFsc2U7XHJcbiAgfTtcclxuXHJcbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gIH0pO1xyXG5cclxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignc2VsZWN0c3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgfSk7XHJcblxyXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBldmVudFRvdWNoU3RhcnQoZXZlbnQuY2xpZW50WCAqIDIsIGV2ZW50LmNsaWVudFkgKiAyKTtcclxuICB9KTtcclxuXHJcbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIGV2ZW50VG91Y2hNb3ZlKGV2ZW50LmNsaWVudFggKiAyLCBldmVudC5jbGllbnRZICogMik7XHJcbiAgfSk7XHJcblxyXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgZXZlbnRUb3VjaEVuZCgpO1xyXG4gIH0pO1xyXG5cclxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIGV2ZW50VG91Y2hTdGFydChldmVudC50b3VjaGVzWzBdLmNsaWVudFggKiAyLCBldmVudC50b3VjaGVzWzBdLmNsaWVudFkgKiAyKTtcclxuICB9KTtcclxuXHJcbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIGV2ZW50VG91Y2hNb3ZlKGV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WCAqIDIsIGV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WSAqIDIpO1xyXG4gIH0pO1xyXG5cclxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBldmVudFRvdWNoRW5kKCk7XHJcbiAgfSk7XHJcbn07XHJcblxyXG5pbml0KCk7XHJcbiIsInZhciBVdGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XHJcbnZhciBWZWN0b3IyID0gcmVxdWlyZSgnLi92ZWN0b3IyJyk7XHJcbnZhciBGb3JjZSA9IHJlcXVpcmUoJy4vZm9yY2UnKTtcclxuXHJcbnZhciBleHBvcnRzID0gZnVuY3Rpb24oKXtcclxuICB2YXIgTW92ZXIgPSBmdW5jdGlvbigpIHtcclxuICAgIHRoaXMucG9zaXRpb24gPSBuZXcgVmVjdG9yMigpO1xyXG4gICAgdGhpcy52ZWxvY2l0eSA9IG5ldyBWZWN0b3IyKCk7XHJcbiAgICB0aGlzLmFjY2VsZXJhdGlvbiA9IG5ldyBWZWN0b3IyKCk7XHJcbiAgICB0aGlzLmFuY2hvciA9IG5ldyBWZWN0b3IyKCk7XHJcbiAgICB0aGlzLnJhZGl1cyA9IDA7XHJcbiAgICB0aGlzLm1hc3MgPSAxO1xyXG4gICAgdGhpcy5kaXJlY3Rpb24gPSAwO1xyXG4gICAgdGhpcy5yID0gVXRpbC5nZXRSYW5kb21JbnQoMCwgMzIpO1xyXG4gICAgdGhpcy5nID0gVXRpbC5nZXRSYW5kb21JbnQoMCwgMTkyKTtcclxuICAgIHRoaXMuYiA9IFV0aWwuZ2V0UmFuZG9tSW50KDMyLCAyNTUpO1xyXG4gICAgdGhpcy5hID0gMC4xO1xyXG4gICAgdGhpcy50aW1lID0gMDtcclxuICAgIHRoaXMuaXNfYWN0aXZlID0gZmFsc2U7XHJcbiAgfTtcclxuICBcclxuICBNb3Zlci5wcm90b3R5cGUgPSB7XHJcbiAgICBpbml0OiBmdW5jdGlvbih2ZWN0b3IsIHNpemUpIHtcclxuICAgICAgdGhpcy5yYWRpdXMgPSBzaXplO1xyXG4gICAgICB0aGlzLm1hc3MgPSB0aGlzLnJhZGl1cyAvIDEwMDtcclxuICAgICAgdGhpcy5wb3NpdGlvbiA9IHZlY3Rvci5jbG9uZSgpO1xyXG4gICAgICB0aGlzLnZlbG9jaXR5ID0gdmVjdG9yLmNsb25lKCk7XHJcbiAgICAgIHRoaXMuYW5jaG9yID0gdmVjdG9yLmNsb25lKCk7XHJcbiAgICAgIHRoaXMuYWNjZWxlcmF0aW9uLnNldCgwLCAwKTtcclxuICAgICAgdGhpcy5hID0gMTtcclxuICAgICAgdGhpcy50aW1lID0gMDtcclxuICAgIH0sXHJcbiAgICB1cGRhdGVQb3NpdGlvbjogZnVuY3Rpb24oKSB7XHJcbiAgICAgIHRoaXMucG9zaXRpb24uY29weSh0aGlzLnZlbG9jaXR5KTtcclxuICAgIH0sXHJcbiAgICB1cGRhdGVWZWxvY2l0eTogZnVuY3Rpb24oKSB7XHJcbiAgICAgIHRoaXMudmVsb2NpdHkuYWRkKHRoaXMuYWNjZWxlcmF0aW9uKTtcclxuICAgICAgaWYgKHRoaXMudmVsb2NpdHkuZGlzdGFuY2VUbyh0aGlzLnBvc2l0aW9uKSA+PSAxKSB7XHJcbiAgICAgICAgdGhpcy5kaXJlY3QodGhpcy52ZWxvY2l0eSk7XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBhcHBseUZvcmNlOiBmdW5jdGlvbih2ZWN0b3IpIHtcclxuICAgICAgdGhpcy5hY2NlbGVyYXRpb24uYWRkKHZlY3Rvcik7XHJcbiAgICB9LFxyXG4gICAgYXBwbHlGcmljdGlvbjogZnVuY3Rpb24oKSB7XHJcbiAgICAgIHZhciBmcmljdGlvbiA9IEZvcmNlLmZyaWN0aW9uKHRoaXMuYWNjZWxlcmF0aW9uLCAwLjEpO1xyXG4gICAgICB0aGlzLmFwcGx5Rm9yY2UoZnJpY3Rpb24pO1xyXG4gICAgfSxcclxuICAgIGFwcGx5RHJhZ0ZvcmNlOiBmdW5jdGlvbih2YWx1ZSkge1xyXG4gICAgICB2YXIgZHJhZyA9IEZvcmNlLmRyYWcodGhpcy5hY2NlbGVyYXRpb24sIHZhbHVlKTtcclxuICAgICAgdGhpcy5hcHBseUZvcmNlKGRyYWcpO1xyXG4gICAgfSxcclxuICAgIGhvb2s6IGZ1bmN0aW9uKHJlc3RfbGVuZ3RoLCBrKSB7XHJcbiAgICAgIHZhciBmb3JjZSA9IEZvcmNlLmhvb2sodGhpcy52ZWxvY2l0eSwgdGhpcy5hbmNob3IsIHJlc3RfbGVuZ3RoLCBrKTtcclxuICAgICAgdGhpcy5hcHBseUZvcmNlKGZvcmNlKTtcclxuICAgIH0sXHJcbiAgICBkaXJlY3Q6IGZ1bmN0aW9uKHZlY3Rvcikge1xyXG4gICAgICB2YXIgdiA9IHZlY3Rvci5jbG9uZSgpLnN1Yih0aGlzLnBvc2l0aW9uKTtcclxuICAgICAgdGhpcy5kaXJlY3Rpb24gPSBNYXRoLmF0YW4yKHYueSwgdi54KTtcclxuICAgIH0sXHJcbiAgICBkcmF3OiBmdW5jdGlvbihjb250ZXh0KSB7XHJcbiAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gJ3JnYmEoJyArIHRoaXMuciArICcsJyArIHRoaXMuZyArICcsJyArIHRoaXMuYiArICcsJyArIHRoaXMuYSArICcpJztcclxuICAgICAgY29udGV4dC5iZWdpblBhdGgoKTtcclxuICAgICAgY29udGV4dC5hcmModGhpcy5wb3NpdGlvbi54LCB0aGlzLnBvc2l0aW9uLnksIHRoaXMucmFkaXVzLCAwLCBNYXRoLlBJIC8gMTgwLCB0cnVlKTtcclxuICAgICAgY29udGV4dC5maWxsKCk7XHJcbiAgICB9LFxyXG4gICAgYWN0aXZhdGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdGhpcy5pc19hY3RpdmUgPSB0cnVlO1xyXG4gICAgfSxcclxuICAgIGluYWN0aXZhdGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdGhpcy5pc19hY3RpdmUgPSBmYWxzZTtcclxuICAgIH1cclxuICB9O1xyXG4gIFxyXG4gIHJldHVybiBNb3ZlcjtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cygpO1xyXG4iLCJ2YXIgZXhwb3J0cyA9IHtcclxuICBnZXRSYW5kb21JbnQ6IGZ1bmN0aW9uKG1pbiwgbWF4KXtcclxuICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSkgKyBtaW47XHJcbiAgfSxcclxuICBnZXREZWdyZWU6IGZ1bmN0aW9uKHJhZGlhbikge1xyXG4gICAgcmV0dXJuIHJhZGlhbiAvIE1hdGguUEkgKiAxODA7XHJcbiAgfSxcclxuICBnZXRSYWRpYW46IGZ1bmN0aW9uKGRlZ3JlZXMpIHtcclxuICAgIHJldHVybiBkZWdyZWVzICogTWF0aC5QSSAvIDE4MDtcclxuICB9LFxyXG4gIGdldFNwaGVyaWNhbDogZnVuY3Rpb24ocmFkMSwgcmFkMiwgcikge1xyXG4gICAgdmFyIHggPSBNYXRoLmNvcyhyYWQxKSAqIE1hdGguY29zKHJhZDIpICogcjtcclxuICAgIHZhciB6ID0gTWF0aC5jb3MocmFkMSkgKiBNYXRoLnNpbihyYWQyKSAqIHI7XHJcbiAgICB2YXIgeSA9IE1hdGguc2luKHJhZDEpICogcjtcclxuICAgIHJldHVybiBbeCwgeSwgel07XHJcbiAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzO1xyXG4iLCIvLyBcclxuLy8g44GT44GuVmVjdG9yMuOCr+ODqeOCueOBr+OAgXRocmVlLmpz44GuVEhSRUUuVmVjdG9yMuOCr+ODqeOCueOBruioiOeul+W8j+OBruS4gOmDqOOCkuWIqeeUqOOBl+OBpuOBhOOBvuOBmeOAglxyXG4vLyBodHRwczovL2dpdGh1Yi5jb20vbXJkb29iL3RocmVlLmpzL2Jsb2IvbWFzdGVyL3NyYy9tYXRoL1ZlY3RvcjIuanMjTDM2N1xyXG4vLyBcclxuXHJcbnZhciBleHBvcnRzID0gZnVuY3Rpb24oKXtcclxuICB2YXIgVmVjdG9yMiA9IGZ1bmN0aW9uKHgsIHkpIHtcclxuICAgIHRoaXMueCA9IHggfHwgMDtcclxuICAgIHRoaXMueSA9IHkgfHwgMDtcclxuICB9O1xyXG4gIFxyXG4gIFZlY3RvcjIucHJvdG90eXBlID0ge1xyXG4gICAgc2V0OiBmdW5jdGlvbiAoeCwgeSkge1xyXG4gICAgICB0aGlzLnggPSB4O1xyXG4gICAgICB0aGlzLnkgPSB5O1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBjbG9uZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gbmV3IFZlY3RvcjIodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgfSxcclxuICAgIGNvcHk6IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIHRoaXMueCA9IHYueDtcclxuICAgICAgdGhpcy55ID0gdi55O1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBhZGQ6IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIHRoaXMueCArPSB2Lng7XHJcbiAgICAgIHRoaXMueSArPSB2Lnk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGFkZFNjYWxhcjogZnVuY3Rpb24gKHMpIHtcclxuICAgICAgdGhpcy54ICs9IHM7XHJcbiAgICAgIHRoaXMueSArPSBzO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBzdWI6IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIHRoaXMueCAtPSB2Lng7XHJcbiAgICAgIHRoaXMueSAtPSB2Lnk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIHN1YlNjYWxhcjogZnVuY3Rpb24gKHMpIHtcclxuICAgICAgdGhpcy54IC09IHM7XHJcbiAgICAgIHRoaXMueSAtPSBzO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBtdWx0aXBseTogZnVuY3Rpb24gKHYpIHtcclxuICAgICAgdGhpcy54ICo9IHYueDtcclxuICAgICAgdGhpcy55ICo9IHYueTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgbXVsdGlwbHlTY2FsYXI6IGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgIHRoaXMueCAqPSBzO1xyXG4gICAgICB0aGlzLnkgKj0gcztcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgZGl2aWRlOiBmdW5jdGlvbiAodikge1xyXG4gICAgICB0aGlzLnggLz0gdi54O1xyXG4gICAgICB0aGlzLnkgLz0gdi55O1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBkaXZpZGVTY2FsYXI6IGZ1bmN0aW9uIChzKSB7XHJcbiAgICAgIGlmICh0aGlzLnggIT09IDAgJiYgcyAhPT0gMCkgdGhpcy54IC89IHM7XHJcbiAgICAgIGlmICh0aGlzLnkgIT09IDAgJiYgcyAhPT0gMCkgdGhpcy55IC89IHM7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIG1pbjogZnVuY3Rpb24gKHYpIHtcclxuICAgICAgaWYgKHRoaXMueCA8IHYueCkgdGhpcy54ID0gdi54O1xyXG4gICAgICBpZiAodGhpcy55IDwgdi55KSB0aGlzLnkgPSB2Lnk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIG1heDogZnVuY3Rpb24gKHYpIHtcclxuICAgICAgaWYgKHRoaXMueCA+IHYueCkgdGhpcy54ID0gdi54O1xyXG4gICAgICBpZiAodGhpcy55ID4gdi55KSB0aGlzLnkgPSB2Lnk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGNsYW1wOiBmdW5jdGlvbiAodl9taW4sIHZfbWF4KSB7XHJcbiAgICAgIGlmICh0aGlzLnggPCB2X21pbi54KSB7XHJcbiAgICAgICAgdGhpcy54ID0gdl9taW4ueDtcclxuICAgICAgfSBlbHNlIGlmICh0aGlzLnggPiB2X21heC54KSB7XHJcbiAgICAgICAgdGhpcy54ID0gdl9tYXgueDtcclxuICAgICAgfVxyXG4gICAgICBpZiAodGhpcy55IDwgdl9taW4ueSkge1xyXG4gICAgICAgIHRoaXMueSA9IHZfbWluLnk7XHJcbiAgICAgIH0gZWxzZSBpZiAodGhpcy55ID4gdl9tYXgueSkge1xyXG4gICAgICAgIHRoaXMueSA9IHZfbWF4Lnk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgY2xhbXBTY2FsYXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIG1pbiwgbWF4O1xyXG4gICAgICByZXR1cm4gZnVuY3Rpb24gY2xhbXBTY2FsYXIobWluVmFsLCBtYXhWYWwpIHtcclxuICAgICAgICBpZiAobWluID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIG1pbiA9IG5ldyBWZWN0b3IyKCk7XHJcbiAgICAgICAgICBtYXggPSBuZXcgVmVjdG9yMigpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBtaW4uc2V0KG1pblZhbCwgbWluVmFsKTtcclxuICAgICAgICBtYXguc2V0KG1heFZhbCwgbWF4VmFsKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5jbGFtcChtaW4sIG1heCk7XHJcbiAgICAgIH07XHJcbiAgICB9KCksXHJcbiAgICBmbG9vcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnggPSBNYXRoLmZsb29yKHRoaXMueCk7XHJcbiAgICAgIHRoaXMueSA9IE1hdGguZmxvb3IodGhpcy55KTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgY2VpbDogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnggPSBNYXRoLmNlaWwodGhpcy54KTtcclxuICAgICAgdGhpcy55ID0gTWF0aC5jZWlsKHRoaXMueSk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIHJvdW5kOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHRoaXMueCA9IE1hdGgucm91bmQodGhpcy54KTtcclxuICAgICAgdGhpcy55ID0gTWF0aC5yb3VuZCh0aGlzLnkpO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICByb3VuZFRvWmVybzogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnggPSAodGhpcy54IDwgMCkgPyBNYXRoLmNlaWwodGhpcy54KSA6IE1hdGguZmxvb3IodGhpcy54KTtcclxuICAgICAgdGhpcy55ID0gKHRoaXMueSA8IDApID8gTWF0aC5jZWlsKHRoaXMueSkgOiBNYXRoLmZsb29yKHRoaXMueSk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIG5lZ2F0ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICB0aGlzLnggPSAtIHRoaXMueDtcclxuICAgICAgdGhpcy55ID0gLSB0aGlzLnk7XHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGRvdDogZnVuY3Rpb24gKHYpIHtcclxuICAgICAgcmV0dXJuIHRoaXMueCAqIHYueCArIHRoaXMueSAqIHYueTtcclxuICAgIH0sXHJcbiAgICBsZW5ndGhTcTogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gdGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55O1xyXG4gICAgfSxcclxuICAgIGxlbmd0aDogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMubGVuZ3RoU3EoKSk7XHJcbiAgICB9LFxyXG4gICAgbGVuZ3RoTWFuaGF0dGFuOiBmdW5jdGlvbigpIHtcclxuICAgICAgcmV0dXJuIE1hdGguYWJzKHRoaXMueCkgKyBNYXRoLmFicyh0aGlzLnkpO1xyXG4gICAgfSxcclxuICAgIG5vcm1hbGl6ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gdGhpcy5kaXZpZGVTY2FsYXIodGhpcy5sZW5ndGgoKSk7XHJcbiAgICB9LFxyXG4gICAgZGlzdGFuY2VUbzogZnVuY3Rpb24gKHYpIHtcclxuICAgICAgdmFyIGR4ID0gdGhpcy54IC0gdi54O1xyXG4gICAgICB2YXIgZHkgPSB0aGlzLnkgLSB2Lnk7XHJcbiAgICAgIHJldHVybiBNYXRoLnNxcnQoZHggKiBkeCArIGR5ICogZHkpO1xyXG4gICAgfSxcclxuICAgIGRpc3RhbmNlVG9TcXVhcmVkOiBmdW5jdGlvbiAodikge1xyXG4gICAgICB2YXIgZHggPSB0aGlzLnggLSB2LngsIGR5ID0gdGhpcy55IC0gdi55O1xyXG4gICAgICByZXR1cm4gZHggKiBkeCArIGR5ICogZHk7XHJcbiAgICB9LFxyXG4gICAgc2V0TGVuZ3RoOiBmdW5jdGlvbiAobCkge1xyXG4gICAgICB2YXIgb2xkTGVuZ3RoID0gdGhpcy5sZW5ndGgoKTtcclxuICAgICAgaWYgKG9sZExlbmd0aCAhPT0gMCAmJiBsICE9PSBvbGRMZW5ndGgpIHtcclxuICAgICAgICB0aGlzLm11bHRTY2FsYXIobCAvIG9sZExlbmd0aCk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgbGVycDogZnVuY3Rpb24gKHYsIGFscGhhKSB7XHJcbiAgICAgIHRoaXMueCArPSAodi54IC0gdGhpcy54KSAqIGFscGhhO1xyXG4gICAgICB0aGlzLnkgKz0gKHYueSAtIHRoaXMueSkgKiBhbHBoYTtcclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgbGVycFZlY3RvcnM6IGZ1bmN0aW9uICh2MSwgdjIsIGFscGhhKSB7XHJcbiAgICAgIHRoaXMuc3ViVmVjdG9ycyh2MiwgdjEpLm11bHRpcGx5U2NhbGFyKGFscGhhKS5hZGQodjEpO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBlcXVhbHM6IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgIHJldHVybiAoKHYueCA9PT0gdGhpcy54KSAmJiAodi55ID09PSB0aGlzLnkpKTtcclxuICAgIH0sXHJcbiAgICBmcm9tQXJyYXk6IGZ1bmN0aW9uIChhcnJheSwgb2Zmc2V0KSB7XHJcbiAgICAgIGlmIChvZmZzZXQgPT09IHVuZGVmaW5lZCkgb2Zmc2V0ID0gMDtcclxuICAgICAgdGhpcy54ID0gYXJyYXlbIG9mZnNldCBdO1xyXG4gICAgICB0aGlzLnkgPSBhcnJheVsgb2Zmc2V0ICsgMSBdO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICB0b0FycmF5OiBmdW5jdGlvbiAoYXJyYXksIG9mZnNldCkge1xyXG4gICAgICBpZiAoYXJyYXkgPT09IHVuZGVmaW5lZCkgYXJyYXkgPSBbXTtcclxuICAgICAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSBvZmZzZXQgPSAwO1xyXG4gICAgICBhcnJheVsgb2Zmc2V0IF0gPSB0aGlzLng7XHJcbiAgICAgIGFycmF5WyBvZmZzZXQgKyAxIF0gPSB0aGlzLnk7XHJcbiAgICAgIHJldHVybiBhcnJheTtcclxuICAgIH0sXHJcbiAgICBmcm9tQXR0cmlidXRlOiBmdW5jdGlvbiAoYXR0cmlidXRlLCBpbmRleCwgb2Zmc2V0KSB7XHJcbiAgICAgIGlmIChvZmZzZXQgPT09IHVuZGVmaW5lZCkgb2Zmc2V0ID0gMDtcclxuICAgICAgaW5kZXggPSBpbmRleCAqIGF0dHJpYnV0ZS5pdGVtU2l6ZSArIG9mZnNldDtcclxuICAgICAgdGhpcy54ID0gYXR0cmlidXRlLmFycmF5WyBpbmRleCBdO1xyXG4gICAgICB0aGlzLnkgPSBhdHRyaWJ1dGUuYXJyYXlbIGluZGV4ICsgMSBdO1xyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiBWZWN0b3IyO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzKCk7XHJcbiJdfQ==
