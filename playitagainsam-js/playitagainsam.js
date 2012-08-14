

var PIAS = {};


PIAS.Player = function (container) {
    this.container = $(container);
    this.events = [];
    this.current_event = 0;
    this.done_callback = null;
    this.terminals = {};
}


PIAS.Player.prototype.play = function(datafile, cb) {
    var self = this;
    this.events = [];
    this.current_event = 0;
    this.done_callback = cb;
    this.loadDataFile(datafile, function(err) {
        if(err) {
            return cb(err);
        }
        self.handleKeyPress("\n")
    });
}


PIAS.Player.prototype.loadDataFile = function(datafile, cb) {
    var self = this;
    $.ajax({
        url: datafile,
        dataType: "json",
        error: function() { if(cb) { cb("failed to load datafile"); }},
        success: function(data) {
            var events = data["events"];
            if(events) {
                for(var i=0; i<events.length; i++) {
                    var event = events[i];
                    //  Decompose ECHO events into alternating READ/WRITE.
                    //  Decompose READ events into individual characters.
                    if(event.act == "ECHO") {
                        for(var j=0; j<event.data.length; j++) {
                            self.events.push({act: "READ",
                                              term: event.term,
                                              data: event.data.charAt(j)})
                            self.events.push({act: "WRITE",
                                              term: event.term,
                                              data: event.data.charAt(j)})
                        }
                    } else if(event.act == "READ") {
                        for(var j=0; j<event.data.length; j++) {
                            self.events.push({act: "READ",
                                              term: event.term,
                                              data: event.data.charAt(j)})
                        }
                    } else {
                        self.events.push(event);
                    }
                }
            }
            if(cb) { cb(null) };
        }
    });
}


PIAS.Player.prototype.dispatchNextEvent = function() {
    var self = this;
    if(this.current_event >= this.events.length) {
        if(this.done_callback) {
            this.done_callback(null);
            delete this.done_callback;
        }
    } else {
        var event = this.events[this.current_event];
        if (event.act == "PAUSE") {
            setTimeout(function() { self.moveToNextEvent() },
                       event.duration * 1000);
        } else if (event.act == "WRITE") {
            var term = this.terminals[event.term];
            term.write(event.data);
            this.moveToNextEvent();
        }
    }
}


PIAS.Player.prototype.handleKeyPress = function(c) {
    var self = this;
    if(this.current_event < this.events.length) {
        var event = this.events[this.current_event];
        if(event.act == "OPEN" && this.isWaypointChar(c)) {
            if(!self.terminals[event.term]) {
                self.terminals[event.term] = true;
                new PIAS.Terminal(this, function(err, term) {
                    self.terminals[event.term] = term;
                    self.moveToNextEvent();
                });
            }
        } else if(event.act == "CLOSE" && this.isWaypointChar(c)) {
            var term = this.terminals[event.term];
            delete this.terminals[event.term];
            term.close();
            this.moveToNextEvent();
        } else if(event.act == "READ") {
            if(this.isWaypointChar(c)) {
                this.moveToNextEvent();
            } else if (!this.isWaypointChar(event.data)) {
                this.moveToNextEvent();
            }
        }
    }
}


PIAS.Player.prototype.isWaypointChar = function(c) {
    if(c == "\n") {
        return true;
    }
    if(c == "\r") {
        return true;
    }
    return false;
}

PIAS.Player.prototype.moveToNextEvent = function() {
    var self = this;
    this.current_event += 1;
    setTimeout(function() { self.dispatchNextEvent(); }, 0);
}


PIAS.Terminal = function(player, cb) {
    var self = this;
    this.player = player;
    this.frame = $("<iframe src='./terminal/terminal.html' width='800' height='240' />").appendTo(player.container);
    this.channel = Channel.build({
      window: this.frame[0].contentWindow,
      origin: "*",
      scope: "pias",
      onReady: function() {
          self.channel.bind("keysPressed", function(trans, chars) {
              for(var j=0; j<chars.length; j++) {
                  self.player.handleKeyPress(chars.charAt(j));
              }
          });
          cb(null, self);
      }
    });
}


PIAS.Terminal.prototype.write = function(data) {
    this.channel.notify({ method: "write", params: data });
}


PIAS.Terminal.prototype.close = function() {
    this.frame.remove();
}
