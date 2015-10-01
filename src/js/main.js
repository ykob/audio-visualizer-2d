var Util = require('./util');
var Vector2 = require('./vector2');
var Force = require('./force');
var debounce = require('./debounce');
var Mover = require('./mover');

var body_width  = document.body.clientWidth * 2;
var body_height = document.body.clientHeight * 2;
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var last_time_xxx = Date.now();
var vector_touch_start = new Vector2();
var vector_touch_move = new Vector2();
var vector_touch_end = new Vector2();
var is_touched = false;

var init = function() {
  renderloop();
  setEvent();
  resizeCanvas();
  debounce(window, 'resize', function(event){
    resizeCanvas();
  });
};

var render = function() {
  ctx.clearRect(0, 0, body_width, body_height);
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
  body_width  = document.body.clientWidth * 2;
  body_height = document.body.clientHeight * 2;

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
