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
    var x = i / fft_size * body_width;
    var y = Math.log(128) / Math.log(256) * body_height * 0.9;
    var position = new Vector2(x, y);
    
    mover.init(position, 6);
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
    var y = Math.log(256 - spectrums[i * 2]) / Math.log(256) * body_height * 0.9;
    
    mover.velocity.y = y;
    mover.updateVelocity();
    mover.updatePosition();
    mover.draw(ctx);
  }
  
  
  // ctx.fillStyle = 'rgba(0, 210, 200, 1)';
  // ctx.lineWidth = 4;
  // ctx.beginPath();
  // for (var i = 0; i < spectrum_length; i++) {
  //   var x = i / fft_size * body_width;
  //   var y = (Math.log(256 - spectrums[i]) / Math.log(256)) * body_height * 0.9;
    
  //   if (i === 0) {
  //     ctx.moveTo(x, y);
  //   } else {
  //     ctx.lineTo(x, y);
  //   }
  // }
  // ctx.lineTo(body_width, body_height);
  // ctx.lineTo(0, body_height);
  // ctx.fill();
};

var render = function() {
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
    this.r = 220;
    this.g = 30;
    this.b = 30;
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvZGVib3VuY2UuanMiLCJzcmMvanMvZm9yY2UuanMiLCJzcmMvanMvbWFpbi5qcyIsInNyYy9qcy9tb3Zlci5qcyIsInNyYy9qcy91dGlsLmpzIiwic3JjL2pzL3ZlY3RvcjIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9iamVjdCwgZXZlbnRUeXBlLCBjYWxsYmFjayl7XG4gIHZhciB0aW1lcjtcblxuICBvYmplY3QuYWRkRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIGNhbGxiYWNrKGV2ZW50KTtcbiAgICB9LCA1MDApO1xuICB9LCBmYWxzZSk7XG59O1xuIiwidmFyIFZlY3RvcjIgPSByZXF1aXJlKCcuL3ZlY3RvcjInKTtcblxudmFyIGV4cG9ydHMgPSB7XG4gIGZyaWN0aW9uOiBmdW5jdGlvbihhY2NlbGVyYXRpb24sIG11LCBub3JtYWwsIG1hc3MpIHtcbiAgICB2YXIgZm9yY2UgPSBhY2NlbGVyYXRpb24uY2xvbmUoKTtcbiAgICBpZiAoIW5vcm1hbCkgbm9ybWFsID0gMTtcbiAgICBpZiAoIW1hc3MpIG1hc3MgPSAxO1xuICAgIGZvcmNlLm11bHRpcGx5U2NhbGFyKC0xKTtcbiAgICBmb3JjZS5ub3JtYWxpemUoKTtcbiAgICBmb3JjZS5tdWx0aXBseVNjYWxhcihtdSk7XG4gICAgcmV0dXJuIGZvcmNlO1xuICB9LFxuICBkcmFnOiBmdW5jdGlvbihhY2NlbGVyYXRpb24sIHZhbHVlKSB7XG4gICAgdmFyIGZvcmNlID0gYWNjZWxlcmF0aW9uLmNsb25lKCk7XG4gICAgZm9yY2UubXVsdGlwbHlTY2FsYXIoLTEpO1xuICAgIGZvcmNlLm5vcm1hbGl6ZSgpO1xuICAgIGZvcmNlLm11bHRpcGx5U2NhbGFyKGFjY2VsZXJhdGlvbi5sZW5ndGgoKSAqIHZhbHVlKTtcbiAgICByZXR1cm4gZm9yY2U7XG4gIH0sXG4gIGhvb2s6IGZ1bmN0aW9uKHZlbG9jaXR5LCBhbmNob3IsIHJlc3RfbGVuZ3RoLCBrKSB7XG4gICAgdmFyIGZvcmNlID0gdmVsb2NpdHkuY2xvbmUoKS5zdWIoYW5jaG9yKTtcbiAgICB2YXIgZGlzdGFuY2UgPSBmb3JjZS5sZW5ndGgoKSAtIHJlc3RfbGVuZ3RoO1xuICAgIGZvcmNlLm5vcm1hbGl6ZSgpO1xuICAgIGZvcmNlLm11bHRpcGx5U2NhbGFyKC0xICogayAqIGRpc3RhbmNlKTtcbiAgICByZXR1cm4gZm9yY2U7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cztcbiIsInZhciBVdGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgVmVjdG9yMiA9IHJlcXVpcmUoJy4vdmVjdG9yMicpO1xudmFyIEZvcmNlID0gcmVxdWlyZSgnLi9mb3JjZScpO1xudmFyIGRlYm91bmNlID0gcmVxdWlyZSgnLi9kZWJvdW5jZScpO1xudmFyIE1vdmVyID0gcmVxdWlyZSgnLi9tb3ZlcicpO1xuXG52YXIgYm9keSA9IGRvY3VtZW50LmJvZHk7XG52YXIgYm9keV93aWR0aCAgPSBib2R5LmNsaWVudFdpZHRoICogMjtcbnZhciBib2R5X2hlaWdodCA9IGJvZHkuY2xpZW50SGVpZ2h0ICogMjtcbnZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG52YXIgYXVkaW9fY3R4ID0gbmV3ICh3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQpKCk7XG52YXIgYXVkaW9fYW5hbHlzZXIgPSBhdWRpb19jdHguY3JlYXRlQW5hbHlzZXIoKTtcbnZhciBhdWRpb19idWZmZXIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbnZhciBhdWRpb191cmwgPSAnaHR0cHM6Ly9hcGkuc291bmRjbG91ZC5jb20vdHJhY2tzLzg5Mjk3Njk4L3N0cmVhbT9jbGllbnRfaWQ9MGFhZjczYjRkZTI0ZWU0ZTg2MzEzZTAxZDQ1ODA4M2QnO1xudmFyIGZmdF9zaXplID0gNTEyO1xudmFyIG1vdmVycyA9IFtdO1xudmFyIGdyYXZpdHkgPSBuZXcgVmVjdG9yMigwLCAwLjUpO1xudmFyIGxhc3RfdGltZV94eHggPSBEYXRlLm5vdygpO1xudmFyIHZlY3Rvcl90b3VjaF9zdGFydCA9IG5ldyBWZWN0b3IyKCk7XG52YXIgdmVjdG9yX3RvdWNoX21vdmUgPSBuZXcgVmVjdG9yMigpO1xudmFyIHZlY3Rvcl90b3VjaF9lbmQgPSBuZXcgVmVjdG9yMigpO1xudmFyIGlzX3RvdWNoZWQgPSBmYWxzZTtcblxudmFyIGluaXQgPSBmdW5jdGlvbigpIHtcbiAgcG9vbE1vdmVyKCk7XG4gIGluaXRBdWRpbygpO1xuICBzZXRFdmVudCgpO1xuICByZXNpemVDYW52YXMoKTtcbiAgcmVuZGVybG9vcCgpO1xuICBkZWJvdW5jZSh3aW5kb3csICdyZXNpemUnLCBmdW5jdGlvbihldmVudCl7XG4gICAgcmVzaXplQ2FudmFzKCk7XG4gIH0pO1xufTtcblxudmFyIGluaXRBdWRpbyA9IGZ1bmN0aW9uKCkge1xuICBhdWRpb19hbmFseXNlci5mZnRfc2l6ZSA9IGZmdF9zaXplO1xuICBhdWRpb19hbmFseXNlci5jb25uZWN0KGF1ZGlvX2N0eC5kZXN0aW5hdGlvbik7XG4gIGxvYWRBdWRpbygpO1xufTtcblxudmFyIGxvYWRBdWRpbyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICBcbiAgcmVxdWVzdC5vcGVuKCdHRVQnLCBhdWRpb191cmwsIHRydWUpO1xuICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgYXVkaW9fY3R4LmRlY29kZUF1ZGlvRGF0YShyZXF1ZXN0LnJlc3BvbnNlLCBmdW5jdGlvbihidWZmZXIpIHtcbiAgICAgIGF1ZGlvX2J1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgIHBsYXlBdWRpbygpO1xuICAgIH0pO1xuICB9O1xuICByZXF1ZXN0LnNlbmQoKTtcbn07XG5cbnZhciBwbGF5QXVkaW8gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNvdXJjZSA9IGF1ZGlvX2N0eC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgXG4gIHNvdXJjZS5idWZmZXIgPSBhdWRpb19idWZmZXI7XG4gIHNvdXJjZS5jb25uZWN0KGF1ZGlvX2FuYWx5c2VyKTtcbiAgc291cmNlLnN0YXJ0KDApO1xufTtcblxudmFyIHBvb2xNb3ZlciA9IGZ1bmN0aW9uKCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGZmdF9zaXplOyBpKyspIHtcbiAgICB2YXIgbW92ZXIgPSBuZXcgTW92ZXIoKTtcbiAgICB2YXIgeCA9IGkgLyBmZnRfc2l6ZSAqIGJvZHlfd2lkdGg7XG4gICAgdmFyIHkgPSBNYXRoLmxvZygxMjgpIC8gTWF0aC5sb2coMjU2KSAqIGJvZHlfaGVpZ2h0ICogMC45O1xuICAgIHZhciBwb3NpdGlvbiA9IG5ldyBWZWN0b3IyKHgsIHkpO1xuICAgIFxuICAgIG1vdmVyLmluaXQocG9zaXRpb24sIDYpO1xuICAgIG1vdmVycy5wdXNoKG1vdmVyKTtcbiAgfVxufTtcblxudmFyIHVwZGF0ZU1vdmVyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzcGVjdHJ1bXMgPSBuZXcgVWludDhBcnJheShhdWRpb19hbmFseXNlci5mcmVxdWVuY3lCaW5Db3VudCk7XG4gIHZhciBzdHIgPSAnJztcbiAgdmFyIGxlbmd0aCA9IDA7XG4gIFxuICBhdWRpb19hbmFseXNlci5nZXRCeXRlVGltZURvbWFpbkRhdGEoc3BlY3RydW1zKTtcbiAgc3BlY3RydW1fbGVuZ3RoID0gYXVkaW9fYW5hbHlzZXIuZnJlcXVlbmN5QmluQ291bnQ7XG4gIFxuICBmb3IgKHZhciBpID0gMDsgaSA8IG1vdmVycy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBtb3ZlciA9IG1vdmVyc1tpXTtcbiAgICB2YXIgeSA9IE1hdGgubG9nKDI1NiAtIHNwZWN0cnVtc1tpICogMl0pIC8gTWF0aC5sb2coMjU2KSAqIGJvZHlfaGVpZ2h0ICogMC45O1xuICAgIFxuICAgIG1vdmVyLnZlbG9jaXR5LnkgPSB5O1xuICAgIG1vdmVyLnVwZGF0ZVZlbG9jaXR5KCk7XG4gICAgbW92ZXIudXBkYXRlUG9zaXRpb24oKTtcbiAgICBtb3Zlci5kcmF3KGN0eCk7XG4gIH1cbiAgXG4gIFxuICAvLyBjdHguZmlsbFN0eWxlID0gJ3JnYmEoMCwgMjEwLCAyMDAsIDEpJztcbiAgLy8gY3R4LmxpbmVXaWR0aCA9IDQ7XG4gIC8vIGN0eC5iZWdpblBhdGgoKTtcbiAgLy8gZm9yICh2YXIgaSA9IDA7IGkgPCBzcGVjdHJ1bV9sZW5ndGg7IGkrKykge1xuICAvLyAgIHZhciB4ID0gaSAvIGZmdF9zaXplICogYm9keV93aWR0aDtcbiAgLy8gICB2YXIgeSA9IChNYXRoLmxvZygyNTYgLSBzcGVjdHJ1bXNbaV0pIC8gTWF0aC5sb2coMjU2KSkgKiBib2R5X2hlaWdodCAqIDAuOTtcbiAgICBcbiAgLy8gICBpZiAoaSA9PT0gMCkge1xuICAvLyAgICAgY3R4Lm1vdmVUbyh4LCB5KTtcbiAgLy8gICB9IGVsc2Uge1xuICAvLyAgICAgY3R4LmxpbmVUbyh4LCB5KTtcbiAgLy8gICB9XG4gIC8vIH1cbiAgLy8gY3R4LmxpbmVUbyhib2R5X3dpZHRoLCBib2R5X2hlaWdodCk7XG4gIC8vIGN0eC5saW5lVG8oMCwgYm9keV9oZWlnaHQpO1xuICAvLyBjdHguZmlsbCgpO1xufTtcblxudmFyIHJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICBjdHguY2xlYXJSZWN0KDAsIDAsIGJvZHlfd2lkdGgsIGJvZHlfaGVpZ2h0KTtcbiAgdXBkYXRlTW92ZXIoKTtcbn07XG5cbnZhciByZW5kZXJsb29wID0gZnVuY3Rpb24oKSB7XG4gIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICBcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlcmxvb3ApO1xuICByZW5kZXIoKTtcbiAgLy8gaWYgKG5vdyAtIGxhc3RfdGltZV94eHggPiAxMDAwKSB7XG4gIC8vICAgZnVuY3Rpb25fbmFtZSgpO1xuICAvLyAgIGxhc3RfdGltZV94eHggPSBEYXRlLm5vdygpO1xuICAvLyB9XG59O1xuXG52YXIgcmVzaXplQ2FudmFzID0gZnVuY3Rpb24oKSB7XG4gIGJvZHlfd2lkdGggID0gYm9keS5jbGllbnRXaWR0aCAqIDI7XG4gIGJvZHlfaGVpZ2h0ID0gYm9keS5jbGllbnRIZWlnaHQgKiAyO1xuXG4gIGNhbnZhcy53aWR0aCA9IGJvZHlfd2lkdGg7XG4gIGNhbnZhcy5oZWlnaHQgPSBib2R5X2hlaWdodDtcbiAgY2FudmFzLnN0eWxlLndpZHRoID0gYm9keV93aWR0aCAvIDIgKyAncHgnO1xuICBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gYm9keV9oZWlnaHQgLyAyICsgJ3B4Jztcbn07XG5cbnZhciBzZXRFdmVudCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGV2ZW50VG91Y2hTdGFydCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB2ZWN0b3JfdG91Y2hfc3RhcnQuc2V0KHgsIHkpO1xuICAgIGlzX3RvdWNoZWQgPSB0cnVlO1xuICB9O1xuICBcbiAgdmFyIGV2ZW50VG91Y2hNb3ZlID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHZlY3Rvcl90b3VjaF9tb3ZlLnNldCh4LCB5KTtcbiAgICBpZiAoaXNfdG91Y2hlZCkge1xuICAgICAgXG4gICAgfVxuICB9O1xuICBcbiAgdmFyIGV2ZW50VG91Y2hFbmQgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgdmVjdG9yX3RvdWNoX2VuZC5zZXQoeCwgeSk7XG4gICAgaXNfdG91Y2hlZCA9IGZhbHNlO1xuICB9O1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdjb250ZXh0bWVudScsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gIH0pO1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdzZWxlY3RzdGFydCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gIH0pO1xuXG4gIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50VG91Y2hTdGFydChldmVudC5jbGllbnRYICogMiwgZXZlbnQuY2xpZW50WSAqIDIpO1xuICB9KTtcblxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudFRvdWNoTW92ZShldmVudC5jbGllbnRYICogMiwgZXZlbnQuY2xpZW50WSAqIDIpO1xuICB9KTtcblxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnRUb3VjaEVuZCgpO1xuICB9KTtcblxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnRUb3VjaFN0YXJ0KGV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WCAqIDIsIGV2ZW50LnRvdWNoZXNbMF0uY2xpZW50WSAqIDIpO1xuICB9KTtcblxuICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudFRvdWNoTW92ZShldmVudC50b3VjaGVzWzBdLmNsaWVudFggKiAyLCBldmVudC50b3VjaGVzWzBdLmNsaWVudFkgKiAyKTtcbiAgfSk7XG5cbiAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudFRvdWNoRW5kKCk7XG4gIH0pO1xufTtcblxuaW5pdCgpO1xuIiwidmFyIFV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBWZWN0b3IyID0gcmVxdWlyZSgnLi92ZWN0b3IyJyk7XG52YXIgRm9yY2UgPSByZXF1aXJlKCcuL2ZvcmNlJyk7XG5cbnZhciBleHBvcnRzID0gZnVuY3Rpb24oKXtcbiAgdmFyIE1vdmVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wb3NpdGlvbiA9IG5ldyBWZWN0b3IyKCk7XG4gICAgdGhpcy52ZWxvY2l0eSA9IG5ldyBWZWN0b3IyKCk7XG4gICAgdGhpcy5hY2NlbGVyYXRpb24gPSBuZXcgVmVjdG9yMigpO1xuICAgIHRoaXMuYW5jaG9yID0gbmV3IFZlY3RvcjIoKTtcbiAgICB0aGlzLnJhZGl1cyA9IDA7XG4gICAgdGhpcy5tYXNzID0gMTtcbiAgICB0aGlzLmRpcmVjdGlvbiA9IDA7XG4gICAgdGhpcy5yID0gMjIwO1xuICAgIHRoaXMuZyA9IDMwO1xuICAgIHRoaXMuYiA9IDMwO1xuICAgIHRoaXMuYSA9IDE7XG4gICAgdGhpcy50aW1lID0gMDtcbiAgICB0aGlzLmlzX2FjdGl2ZSA9IGZhbHNlO1xuICB9O1xuICBcbiAgTW92ZXIucHJvdG90eXBlID0ge1xuICAgIGluaXQ6IGZ1bmN0aW9uKHZlY3Rvciwgc2l6ZSkge1xuICAgICAgdGhpcy5yYWRpdXMgPSBzaXplO1xuICAgICAgdGhpcy5tYXNzID0gdGhpcy5yYWRpdXMgLyAxMDA7XG4gICAgICB0aGlzLnBvc2l0aW9uID0gdmVjdG9yLmNsb25lKCk7XG4gICAgICB0aGlzLnZlbG9jaXR5ID0gdmVjdG9yLmNsb25lKCk7XG4gICAgICB0aGlzLmFuY2hvciA9IHZlY3Rvci5jbG9uZSgpO1xuICAgICAgdGhpcy5hY2NlbGVyYXRpb24uc2V0KDAsIDApO1xuICAgICAgdGhpcy5hID0gMTtcbiAgICAgIHRoaXMudGltZSA9IDA7XG4gICAgfSxcbiAgICB1cGRhdGVQb3NpdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnBvc2l0aW9uLmNvcHkodGhpcy52ZWxvY2l0eSk7XG4gICAgfSxcbiAgICB1cGRhdGVWZWxvY2l0eTogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnZlbG9jaXR5LmFkZCh0aGlzLmFjY2VsZXJhdGlvbik7XG4gICAgICBpZiAodGhpcy52ZWxvY2l0eS5kaXN0YW5jZVRvKHRoaXMucG9zaXRpb24pID49IDEpIHtcbiAgICAgICAgdGhpcy5kaXJlY3QodGhpcy52ZWxvY2l0eSk7XG4gICAgICB9XG4gICAgfSxcbiAgICBhcHBseUZvcmNlOiBmdW5jdGlvbih2ZWN0b3IpIHtcbiAgICAgIHRoaXMuYWNjZWxlcmF0aW9uLmFkZCh2ZWN0b3IpO1xuICAgIH0sXG4gICAgYXBwbHlGcmljdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZnJpY3Rpb24gPSBGb3JjZS5mcmljdGlvbih0aGlzLmFjY2VsZXJhdGlvbiwgMC4xKTtcbiAgICAgIHRoaXMuYXBwbHlGb3JjZShmcmljdGlvbik7XG4gICAgfSxcbiAgICBhcHBseURyYWdGb3JjZTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHZhciBkcmFnID0gRm9yY2UuZHJhZyh0aGlzLmFjY2VsZXJhdGlvbiwgdmFsdWUpO1xuICAgICAgdGhpcy5hcHBseUZvcmNlKGRyYWcpO1xuICAgIH0sXG4gICAgaG9vazogZnVuY3Rpb24ocmVzdF9sZW5ndGgsIGspIHtcbiAgICAgIHZhciBmb3JjZSA9IEZvcmNlLmhvb2sodGhpcy52ZWxvY2l0eSwgdGhpcy5hbmNob3IsIHJlc3RfbGVuZ3RoLCBrKTtcbiAgICAgIHRoaXMuYXBwbHlGb3JjZShmb3JjZSk7XG4gICAgfSxcbiAgICBkaXJlY3Q6IGZ1bmN0aW9uKHZlY3Rvcikge1xuICAgICAgdmFyIHYgPSB2ZWN0b3IuY2xvbmUoKS5zdWIodGhpcy5wb3NpdGlvbik7XG4gICAgICB0aGlzLmRpcmVjdGlvbiA9IE1hdGguYXRhbjIodi55LCB2LngpO1xuICAgIH0sXG4gICAgZHJhdzogZnVuY3Rpb24oY29udGV4dCkge1xuICAgICAgY29udGV4dC5maWxsU3R5bGUgPSAncmdiYSgnICsgdGhpcy5yICsgJywnICsgdGhpcy5nICsgJywnICsgdGhpcy5iICsgJywnICsgdGhpcy5hICsgJyknO1xuICAgICAgY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICAgIGNvbnRleHQuYXJjKHRoaXMucG9zaXRpb24ueCwgdGhpcy5wb3NpdGlvbi55LCB0aGlzLnJhZGl1cywgMCwgTWF0aC5QSSAvIDE4MCwgdHJ1ZSk7XG4gICAgICBjb250ZXh0LmZpbGwoKTtcbiAgICB9LFxuICAgIGFjdGl2YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLmlzX2FjdGl2ZSA9IHRydWU7XG4gICAgfSxcbiAgICBpbmFjdGl2YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLmlzX2FjdGl2ZSA9IGZhbHNlO1xuICAgIH1cbiAgfTtcbiAgXG4gIHJldHVybiBNb3Zlcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cygpO1xuIiwidmFyIGV4cG9ydHMgPSB7XG4gIGdldFJhbmRvbUludDogZnVuY3Rpb24obWluLCBtYXgpe1xuICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSkgKyBtaW47XG4gIH0sXG4gIGdldERlZ3JlZTogZnVuY3Rpb24ocmFkaWFuKSB7XG4gICAgcmV0dXJuIHJhZGlhbiAvIE1hdGguUEkgKiAxODA7XG4gIH0sXG4gIGdldFJhZGlhbjogZnVuY3Rpb24oZGVncmVlcykge1xuICAgIHJldHVybiBkZWdyZWVzICogTWF0aC5QSSAvIDE4MDtcbiAgfSxcbiAgZ2V0U3BoZXJpY2FsOiBmdW5jdGlvbihyYWQxLCByYWQyLCByKSB7XG4gICAgdmFyIHggPSBNYXRoLmNvcyhyYWQxKSAqIE1hdGguY29zKHJhZDIpICogcjtcbiAgICB2YXIgeiA9IE1hdGguY29zKHJhZDEpICogTWF0aC5zaW4ocmFkMikgKiByO1xuICAgIHZhciB5ID0gTWF0aC5zaW4ocmFkMSkgKiByO1xuICAgIHJldHVybiBbeCwgeSwgel07XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cztcbiIsIi8vIFxuLy8g44GT44GuVmVjdG9yMuOCr+ODqeOCueOBr+OAgXRocmVlLmpz44GuVEhSRUUuVmVjdG9yMuOCr+ODqeOCueOBruioiOeul+W8j+OBruS4gOmDqOOCkuWIqeeUqOOBl+OBpuOBhOOBvuOBmeOAglxuLy8gaHR0cHM6Ly9naXRodWIuY29tL21yZG9vYi90aHJlZS5qcy9ibG9iL21hc3Rlci9zcmMvbWF0aC9WZWN0b3IyLmpzI0wzNjdcbi8vIFxuXG52YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCl7XG4gIHZhciBWZWN0b3IyID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHRoaXMueCA9IHggfHwgMDtcbiAgICB0aGlzLnkgPSB5IHx8IDA7XG4gIH07XG4gIFxuICBWZWN0b3IyLnByb3RvdHlwZSA9IHtcbiAgICBzZXQ6IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICB0aGlzLnggPSB4O1xuICAgICAgdGhpcy55ID0geTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBuZXcgVmVjdG9yMih0aGlzLngsIHRoaXMueSk7XG4gICAgfSxcbiAgICBjb3B5OiBmdW5jdGlvbiAodikge1xuICAgICAgdGhpcy54ID0gdi54O1xuICAgICAgdGhpcy55ID0gdi55O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBhZGQ6IGZ1bmN0aW9uICh2KSB7XG4gICAgICB0aGlzLnggKz0gdi54O1xuICAgICAgdGhpcy55ICs9IHYueTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgYWRkU2NhbGFyOiBmdW5jdGlvbiAocykge1xuICAgICAgdGhpcy54ICs9IHM7XG4gICAgICB0aGlzLnkgKz0gcztcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc3ViOiBmdW5jdGlvbiAodikge1xuICAgICAgdGhpcy54IC09IHYueDtcbiAgICAgIHRoaXMueSAtPSB2Lnk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHN1YlNjYWxhcjogZnVuY3Rpb24gKHMpIHtcbiAgICAgIHRoaXMueCAtPSBzO1xuICAgICAgdGhpcy55IC09IHM7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIG11bHRpcGx5OiBmdW5jdGlvbiAodikge1xuICAgICAgdGhpcy54ICo9IHYueDtcbiAgICAgIHRoaXMueSAqPSB2Lnk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIG11bHRpcGx5U2NhbGFyOiBmdW5jdGlvbiAocykge1xuICAgICAgdGhpcy54ICo9IHM7XG4gICAgICB0aGlzLnkgKj0gcztcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZGl2aWRlOiBmdW5jdGlvbiAodikge1xuICAgICAgdGhpcy54IC89IHYueDtcbiAgICAgIHRoaXMueSAvPSB2Lnk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGRpdmlkZVNjYWxhcjogZnVuY3Rpb24gKHMpIHtcbiAgICAgIGlmICh0aGlzLnggIT09IDAgJiYgcyAhPT0gMCkgdGhpcy54IC89IHM7XG4gICAgICBpZiAodGhpcy55ICE9PSAwICYmIHMgIT09IDApIHRoaXMueSAvPSBzO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBtaW46IGZ1bmN0aW9uICh2KSB7XG4gICAgICBpZiAodGhpcy54IDwgdi54KSB0aGlzLnggPSB2Lng7XG4gICAgICBpZiAodGhpcy55IDwgdi55KSB0aGlzLnkgPSB2Lnk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIG1heDogZnVuY3Rpb24gKHYpIHtcbiAgICAgIGlmICh0aGlzLnggPiB2LngpIHRoaXMueCA9IHYueDtcbiAgICAgIGlmICh0aGlzLnkgPiB2LnkpIHRoaXMueSA9IHYueTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgY2xhbXA6IGZ1bmN0aW9uICh2X21pbiwgdl9tYXgpIHtcbiAgICAgIGlmICh0aGlzLnggPCB2X21pbi54KSB7XG4gICAgICAgIHRoaXMueCA9IHZfbWluLng7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMueCA+IHZfbWF4LngpIHtcbiAgICAgICAgdGhpcy54ID0gdl9tYXgueDtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnkgPCB2X21pbi55KSB7XG4gICAgICAgIHRoaXMueSA9IHZfbWluLnk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMueSA+IHZfbWF4LnkpIHtcbiAgICAgICAgdGhpcy55ID0gdl9tYXgueTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgY2xhbXBTY2FsYXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBtaW4sIG1heDtcbiAgICAgIHJldHVybiBmdW5jdGlvbiBjbGFtcFNjYWxhcihtaW5WYWwsIG1heFZhbCkge1xuICAgICAgICBpZiAobWluID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBtaW4gPSBuZXcgVmVjdG9yMigpO1xuICAgICAgICAgIG1heCA9IG5ldyBWZWN0b3IyKCk7XG4gICAgICAgIH1cbiAgICAgICAgbWluLnNldChtaW5WYWwsIG1pblZhbCk7XG4gICAgICAgIG1heC5zZXQobWF4VmFsLCBtYXhWYWwpO1xuICAgICAgICByZXR1cm4gdGhpcy5jbGFtcChtaW4sIG1heCk7XG4gICAgICB9O1xuICAgIH0oKSxcbiAgICBmbG9vcjogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy54ID0gTWF0aC5mbG9vcih0aGlzLngpO1xuICAgICAgdGhpcy55ID0gTWF0aC5mbG9vcih0aGlzLnkpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBjZWlsOiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLnggPSBNYXRoLmNlaWwodGhpcy54KTtcbiAgICAgIHRoaXMueSA9IE1hdGguY2VpbCh0aGlzLnkpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICByb3VuZDogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy54ID0gTWF0aC5yb3VuZCh0aGlzLngpO1xuICAgICAgdGhpcy55ID0gTWF0aC5yb3VuZCh0aGlzLnkpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICByb3VuZFRvWmVybzogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy54ID0gKHRoaXMueCA8IDApID8gTWF0aC5jZWlsKHRoaXMueCkgOiBNYXRoLmZsb29yKHRoaXMueCk7XG4gICAgICB0aGlzLnkgPSAodGhpcy55IDwgMCkgPyBNYXRoLmNlaWwodGhpcy55KSA6IE1hdGguZmxvb3IodGhpcy55KTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgbmVnYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLnggPSAtIHRoaXMueDtcbiAgICAgIHRoaXMueSA9IC0gdGhpcy55O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBkb3Q6IGZ1bmN0aW9uICh2KSB7XG4gICAgICByZXR1cm4gdGhpcy54ICogdi54ICsgdGhpcy55ICogdi55O1xuICAgIH0sXG4gICAgbGVuZ3RoU3E6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnk7XG4gICAgfSxcbiAgICBsZW5ndGg6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy5sZW5ndGhTcSgpKTtcbiAgICB9LFxuICAgIGxlbmd0aE1hbmhhdHRhbjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gTWF0aC5hYnModGhpcy54KSArIE1hdGguYWJzKHRoaXMueSk7XG4gICAgfSxcbiAgICBub3JtYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB0aGlzLmRpdmlkZVNjYWxhcih0aGlzLmxlbmd0aCgpKTtcbiAgICB9LFxuICAgIGRpc3RhbmNlVG86IGZ1bmN0aW9uICh2KSB7XG4gICAgICB2YXIgZHggPSB0aGlzLnggLSB2Lng7XG4gICAgICB2YXIgZHkgPSB0aGlzLnkgLSB2Lnk7XG4gICAgICByZXR1cm4gTWF0aC5zcXJ0KGR4ICogZHggKyBkeSAqIGR5KTtcbiAgICB9LFxuICAgIGRpc3RhbmNlVG9TcXVhcmVkOiBmdW5jdGlvbiAodikge1xuICAgICAgdmFyIGR4ID0gdGhpcy54IC0gdi54LCBkeSA9IHRoaXMueSAtIHYueTtcbiAgICAgIHJldHVybiBkeCAqIGR4ICsgZHkgKiBkeTtcbiAgICB9LFxuICAgIHNldExlbmd0aDogZnVuY3Rpb24gKGwpIHtcbiAgICAgIHZhciBvbGRMZW5ndGggPSB0aGlzLmxlbmd0aCgpO1xuICAgICAgaWYgKG9sZExlbmd0aCAhPT0gMCAmJiBsICE9PSBvbGRMZW5ndGgpIHtcbiAgICAgICAgdGhpcy5tdWx0U2NhbGFyKGwgLyBvbGRMZW5ndGgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBsZXJwOiBmdW5jdGlvbiAodiwgYWxwaGEpIHtcbiAgICAgIHRoaXMueCArPSAodi54IC0gdGhpcy54KSAqIGFscGhhO1xuICAgICAgdGhpcy55ICs9ICh2LnkgLSB0aGlzLnkpICogYWxwaGE7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGxlcnBWZWN0b3JzOiBmdW5jdGlvbiAodjEsIHYyLCBhbHBoYSkge1xuICAgICAgdGhpcy5zdWJWZWN0b3JzKHYyLCB2MSkubXVsdGlwbHlTY2FsYXIoYWxwaGEpLmFkZCh2MSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGVxdWFsczogZnVuY3Rpb24gKHYpIHtcbiAgICAgIHJldHVybiAoKHYueCA9PT0gdGhpcy54KSAmJiAodi55ID09PSB0aGlzLnkpKTtcbiAgICB9LFxuICAgIGZyb21BcnJheTogZnVuY3Rpb24gKGFycmF5LCBvZmZzZXQpIHtcbiAgICAgIGlmIChvZmZzZXQgPT09IHVuZGVmaW5lZCkgb2Zmc2V0ID0gMDtcbiAgICAgIHRoaXMueCA9IGFycmF5WyBvZmZzZXQgXTtcbiAgICAgIHRoaXMueSA9IGFycmF5WyBvZmZzZXQgKyAxIF07XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHRvQXJyYXk6IGZ1bmN0aW9uIChhcnJheSwgb2Zmc2V0KSB7XG4gICAgICBpZiAoYXJyYXkgPT09IHVuZGVmaW5lZCkgYXJyYXkgPSBbXTtcbiAgICAgIGlmIChvZmZzZXQgPT09IHVuZGVmaW5lZCkgb2Zmc2V0ID0gMDtcbiAgICAgIGFycmF5WyBvZmZzZXQgXSA9IHRoaXMueDtcbiAgICAgIGFycmF5WyBvZmZzZXQgKyAxIF0gPSB0aGlzLnk7XG4gICAgICByZXR1cm4gYXJyYXk7XG4gICAgfSxcbiAgICBmcm9tQXR0cmlidXRlOiBmdW5jdGlvbiAoYXR0cmlidXRlLCBpbmRleCwgb2Zmc2V0KSB7XG4gICAgICBpZiAob2Zmc2V0ID09PSB1bmRlZmluZWQpIG9mZnNldCA9IDA7XG4gICAgICBpbmRleCA9IGluZGV4ICogYXR0cmlidXRlLml0ZW1TaXplICsgb2Zmc2V0O1xuICAgICAgdGhpcy54ID0gYXR0cmlidXRlLmFycmF5WyBpbmRleCBdO1xuICAgICAgdGhpcy55ID0gYXR0cmlidXRlLmFycmF5WyBpbmRleCArIDEgXTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBWZWN0b3IyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzKCk7XG4iXX0=
