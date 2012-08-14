

function PIASPlayer(container) {
    this.container = $(container);
    this.events = [];
    this.current_event = 0;
    this.done_callback = null;
    this.terminals = {};
}


PIASPlayer.prototype.loadDataFile = function(datafile, cb) {
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


PIASPlayer.prototype.play = function(datafile, cb) {
    console.log(["playing", datafile]);
    var self = this;
    this.events = [];
    this.current_event = 0;
    this.done_callback = cb;
    this.loadDataFile(datafile, function(err) {
        console.log(["loaded", datafile]);
        if(err) {
            return cb(err);
        }
        self.dispatchNextEvent();
    });
}


PIASPlayer.prototype.dispatchNextEvent = function() {
    var self = this;
    if(this.current_event >= this.events.length) {
        console.log(["done"]);
        if(this.done_callback) {
            this.done_callback(null);
            delete this.done_callback;
        }
    } else {
        console.log(["dispatch", this.current_event]);
        var moveToNextEvent = function() {
            self.current_event += 1;
            setTimeout(function() { self.dispatchNextEvent(); }, 0);
        }
        var event = this.events[this.current_event];
        if(event.act == "OPEN") {
            new Terminal(this, function(err, term) {
                self.terminals[event.term] = term;
                moveToNextEvent();
            });
        } else if(event.act == "CLOSE") {
            var term = this.terminals[event.term];
            delete this.terminals[event.term];
            term.close();
            moveToNextEvent();
        } else if (event.act == "PAUSE") {
            setTimeout(moveToNextEvent, event.duration * 1000);
        } else if (event.act == "WRITE") {
            var term = this.terminals[event.term];
            term.write(event.data);
            moveToNextEvent();
        }
    }
}


PIASPlayer.prototype.handleKeyPress = function(c) {
    if(this.current_event < this.events.length) {
        var event = this.events[this.current_event];
        if(event.act == "READ") {
            console.log(["keypress", c, event.data]);
            if(event.data == "\n" || event.data == "\r") {
                if(c != "\n" && c != "\r") {
                    return;
                }
            }
            this.current_event += 1;
            this.dispatchNextEvent();
        }
    }
}


function Terminal(player, cb) {
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


Terminal.prototype.write = function(data) {
    this.channel.notify({ method: "write", params: data });
}


Terminal.prototype.close = function() {
    this.frame.remove();
}
