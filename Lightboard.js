var Lightboard = function() {
  var width = Lightboard.VIDEO_WIDTH;
  var height = Lightboard.VIDEO_HEIGHT;
  var video = document.createElement("video");
  var canvas = document.getElementById("video_canvas");
  canvas.width = width;
  canvas.height = height;
  var context = canvas.getContext("2d");
  context.translate(width, 0);
  context.scale(-1,1);
  this.points = [];
  
  var lightboard = document.getElementById("lightboard");
  var lightboard_context = lightboard.getContext("2d");
  //  lightboard_context.beginPath();
  //  lightboard_context.arc(320, 240, 5, 0, 2*Math.PI);
  //  lightboard_context.fill();
  var me = this;  var videoLoop = function() {
    context.drawImage(video, 0, 0, width, height);
    var point = me.findCursor(
        context.getImageData(0, 0, width, height).data);
    if (me.mode === "draw" && point) {
    	me.points.push(point);
    	
      lightboard_context.beginPath();
      lightboard_context.arc(point.x, point.y, point.z/30, 0, 2*Math.PI);
      //lightboard_context.fillStyle = me.depthToColor(point.z);
      lightboard_context.closePath();
      lightboard_context.fill();

      /*
lightboard_context.beginPath();
      lightboard_context.arc(point.xt, point.yt, 3, 0, 2*Math.PI);
      lightboard_context.fillStyle = '#000000';
      lightboard_context.closePath();
      lightboard_context.fill();
*/
      me.lightboard_context = lightboard_context;
    }
    setTimeout(videoLoop, 40);
  };
  getUserMedia({
    video: true,
    audio: false
  }, function(stream) {
    video.src = window.URL.createObjectURL(stream);
    video.play();
    videoLoop();
  }, function(error) {
    console.warn("getUserMedia failed: " + error);
  });
};

Lightboard.VIDEO_WIDTH = 640;
Lightboard.VIDEO_HEIGHT = 480;
Lightboard.BLOCK_WIDTH = 2;
Lightboard.BLOCK_HEIGHT = 2;
Lightboard.BRIGHTNESS_THRESHOLD = 205;
Lightboard.LIGHT_SIZE = 180;

/**
 * @returns point
 *     0 <= point.x < 640
 *     0 <= point.y < 480
 *	   0 <= point.z < 90 (in theory, 0 is closest to camera)
 */
Lightboard.prototype.findCursor = function(img_data) {
  var num_lines = Lightboard.VIDEO_HEIGHT / Lightboard.BLOCK_HEIGHT >>> 0;
  var num_cols = Lightboard.VIDEO_WIDTH / Lightboard.BLOCK_WIDTH >>> 0;
  var i, j, x, y;
  var B = [], V = [];
  for (i = 0; i < num_lines; ++i) {
    B.push([]), V.push([]);
    for (j = 0; j < num_cols; ++j) {
      V[i].push(false);
      var brightness_sum = 0;
      for (y = i*Lightboard.BLOCK_HEIGHT;
           y < (i+1)*Lightboard.BLOCK_HEIGHT; ++y) {
        for (x = j*Lightboard.BLOCK_WIDTH;
             x < (j+1)*Lightboard.BLOCK_WIDTH; ++x) {
          var pixel_idx = (y*Lightboard.VIDEO_WIDTH + x)*4;
          var r = img_data[pixel_idx];
          var g = img_data[pixel_idx+1];
          var b = img_data[pixel_idx+2];
          brightness_sum += (3*r+4*g+b) >>> 3;
        }
      }
      B[i][j] = brightness_sum /
          (Lightboard.BLOCK_HEIGHT*Lightboard.BLOCK_WIDTH) >>> 0;
    }
  }
  var max_size = 0;
  var point = null;
  for (i = 0; i < num_lines; ++i) {
    for (j = 0; j < num_cols; ++j) {
      var block_size = 0;
      var min_x = j, max_x = j, min_y = i, max_y = i;
      var search_stack = [{y: i, x: j}];
      while (search_stack.length) {
        var pos = search_stack.pop();
        x = pos.x;
        y = pos.y;
        if (x >= num_cols || y >= num_lines ||
            x < 0 || y < 0 || V[y][x] ||
            B[y][x] <= Lightboard.BRIGHTNESS_THRESHOLD) {
          continue;
        }
        if (x > max_x) max_x = x;
        if (x < min_x) min_x = x;
        if (y > max_y) max_y = y;
        if (y < min_y) min_y = y;
        V[y][x] = true;
        block_size++;
        search_stack.push({y: y+1, x: x});
        search_stack.push({y: y, x: x+1});
        search_stack.push({y: y-1, x: x});
        search_stack.push({y: y, x: x-1});
      }
      if (block_size > max_size &&
          block_size >= Lightboard.LIGHT_SIZE) {
        max_size = block_size;
        calc_depth = Math.max(Math.min(100 - Math.sqrt(max_size), 100), 0);
        
				console.log(calc_depth);
        //calc_x = (max_x + min_x);
        //calc_y = Lightboard.VIDEO_HEIGHT/2 - (Lightboard.VIDEO_HEIGHT/2 - (max_y + min_y))
        //	*(1+(100-calc_depth)/100);
        point = {
          //x: calc_x,
          //y: calc_y,
          z: calc_depth*6,
          x: max_x + min_x,
          y: max_y + min_y,
        };
      }
    }
  }/*

  console.log(max_size);
  
  if (point) console.log(point);
*/
  return point;
};

/**
*	Turns something
*
**/
Lightboard.prototype.redraw = function(theta) {
	theta = theta * (Math.PI/180);
	this.lightboard_context.clearRect(0, 0, Lightboard.VIDEO_WIDTH, Lightboard.VIDEO_HEIGHT);
	for (i in this.points) {
		point = this.points[i];
		normz = point.z - 200;
		normx = point.x - Lightboard.VIDEO_WIDTH/2;
		radius = Math.sqrt(Math.pow(normz, 2) + Math.pow(normx, 2));
		if (normx < 0){
			radius = -radius;
		}
		angle = Math.atan(normz/normx)
		newangle = angle + theta;
		point.z = 200 + Math.sin(newangle) * radius
		point.x = Lightboard.VIDEO_WIDTH/2 + Math.cos(newangle) * radius
		
    this.lightboard_context.beginPath();
    this.lightboard_context.arc(point.x, point.y, Math.max(point.z/30,1), 0, 2*Math.PI);
    //this.lightboard_context.fillStyle = this.depthToColor(point.z);
    this.lightboard_context.closePath();
    this.lightboard_context.fill();
		}
	
}
Lightboard.prototype.clear = function() {
	this.points = [];
	this.lightboard_context.clearRect(0, 0, Lightboard.VIDEO_WIDTH, Lightboard.VIDEO_HEIGHT);
}

/** 
*	Takes in a value between 200 and 2000
*
**/
Lightboard.prototype.depthToColor = function(z) {
   frequency = 0.1;
   red   = Math.sin(frequency*z + 0) * 127 + 128;
   green = Math.sin(frequency*z + 2) * 127 + 128;
   blue  = Math.sin(frequency*z + 4) * 127 + 128;
   return RGB2Color(red,green,blue);
}

  function RGB2Color(r,g,b)
  {
    return '#' + byte2Hex(r) + byte2Hex(g) + byte2Hex(b);
  }
  
  function byte2Hex(n)
  {
    var nybHexString = "0123456789ABCDEF";
    return String(nybHexString.substr((n >> 4) & 0x0F,1)) + nybHexString.substr(n & 0x0F,1);
  }
