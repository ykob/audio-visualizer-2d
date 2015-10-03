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
