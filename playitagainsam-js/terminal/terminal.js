
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

