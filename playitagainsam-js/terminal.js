
var pias_data = "total 84\r\n-rw-r--r-- 1 rfk rfk    32 Aug  8 15:48 ChangeLog.txt\r\n-rw-r--r-- 1 rfk rfk  1054 Aug  8 15:48 LICENSE.txt\r\n-rw-r--r-- 1 rfk rfk    63 Aug  8 15:48 MANIFEST.in\r\ndrwxr-xr-x 2 rfk rfk  4096 Aug  8 16:37 \u001b[0m\u001b[01;34mplayitagainsam\u001b[0m\r\n-rw-r--r-- 1 rfk rfk     0 Aug  8 15:48 README.rst\r\ndrwxr-xr-x 2 rfk rfk  4096 Aug  8 15:48 \u001b[01;34mscripts\u001b[0m\r\n-rw-r--r-- 1 rfk rfk 10470 Aug  8 15:48 setup.py\r\nsrwxr-xr-x 1 rfk rfk     0 Aug  8 16:37 \u001b[01;35mSOCK\u001b[0m\r\n-rw-r--r-- 1 rfk rfk   247 Aug  8 16:29 TODO.txt\r\nrfk@durian:playitagainsam$ ";

function extend(subClass, baseClass) {
  function inheritance() { }
  inheritance.prototype          = baseClass.prototype;
  subClass.prototype             = new inheritance();
  subClass.prototype.constructor = subClass;
  subClass.prototype.superClass  = baseClass.prototype;
};


function PIASTerminal(container) {
  var self = this;
  this.superClass.constructor.call(this, container);
  this.piasChannel = Channel.build({
    window: window.parent,
    origin: "*",
    scope: "pias",
  });
  this.piasChannel.bind("write", function(trans, data) {
    self.vt100(data);
  });
};

extend(PIASTerminal, VT100);

PIASTerminal.prototype.keysPressed = function(ch) {
 this.piasChannel.notify({method: "keysPressed", params: ch});
}

