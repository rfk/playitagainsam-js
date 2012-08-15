
var PIAS = {};


PIAS.url_root = (function() {
    // Hackery to find the URL of this file.
    // Create an error, then parse the stack trace looking for filenames.
    var errlines = (new Error()).stack.split("\n");
    for(var i=0; i<errlines.length; i++) {
        var endpos = errlines[i].lastIndexOf("playitagainsam.js");
        if(endpos !== -1) {
            var starts = ["@", "at "];
            for(j=0; j<starts.length; j++) {
                var startpos = errlines[i].indexOf(starts[j]);
                if(startpos !== -1 && startpos < endpos) {
                    startpos += starts[j].length;
                    return errlines[i].substring(startpos, endpos);
                }
            }
        }
    }
    return "/";
})();


PIAS.get_resource_url = function(resource) {
    return PIAS.url_root + resource;
}


PIAS.load_script = function(script) {
    var script_url = PIAS.get_resource_url(script);
    document.write("<script src='" + script_url + "'></script>");
}


if(typeof $ === "undefined") {
    PIAS.load_script("jquery-ui/jquery-1.7.2.min.js");
}
if(typeof $.widget === "undefined") {
    PIAS.load_script("jquery-ui/jquery-ui-1.8.22.custom.min.js");
}
if(typeof Channel === "undefined") {
    PIAS.load_script("jschannel.js");
}


PIAS.Player = function (container) {
    var self = this;
    this.container = $(container);
    this.events = [];
    this.current_event = 0;
    this.done_callback = null;
    this.terminals = {};
    this.container.addClass("pias-container");
    this.container.empty();
    // Use an overlay to capture key events.
    // This helps us avoid having to click around between terminals
    // and try to ferry events out of the correct one.
    this.overlay = $("<input class='pias-overlay'>").appendTo(this.container);
    this.overlay.keypress(function(evt) {
        self.handleKeyPress(String.fromCharCode(evt.which));
    });
    this.overlay[0].focus();
    this.resize();
}


PIAS.Player.prototype.play = function(datasource, cb) {
    var self = this;
    this.events = [];
    this.current_event = 0;
    this.done_callback = null;
    var mycb = function(err) {
        if(err) {
            if(cb) { cb(err); }
        } else {
            self.done_callback = cb;
            self.handleKeyPress("\n")
        }
    }
    if(typeof datasource === "string") {
        this.loadDataFile(datasource, mycb);
    } else {
        this.loadEvents(datasource.events, mycb);
    }
}


PIAS.Player.prototype.loadDataFile = function(datafile, cb) {
    var self = this;
    $.ajax({
        url: datafile,
        dataType: "json",
        error: function(err) { if(cb) { cb(err); }},
        success: function(data) {
            if(data.events) {
                self.loadEvents(data.events, cb);
            } else {
                cb("datafile contains no events");
            }
        }
    });
}


PIAS.Player.prototype.loadEvents = function(events, cb) {
    for(var i=0; i<events.length; i++) {
        var event = events[i];
        //  Decompose ECHO events into alternating READ/WRITE.
        //  Decompose READ events into individual characters.
        if(event.act == "ECHO") {
            for(var j=0; j<event.data.length; j++) {
                this.events.push({act: "READ",
                                  term: event.term,
                                  data: event.data.charAt(j)})
                this.events.push({act: "WRITE",
                                  term: event.term,
                                  data: event.data.charAt(j)})
            }
        } else if(event.act == "READ") {
            for(var j=0; j<event.data.length; j++) {
                this.events.push({act: "READ",
                                  term: event.term,
                                  data: event.data.charAt(j)})
            }
        } else {
            this.events.push(event);
        }
    }
    cb(null);
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
                    self.resize();
                    console.log("focussing overlay");
                    self.overlay[0].focus();
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

PIAS.Player.prototype.resize = function() {
    this.overlay.position({
      my: "left top", at: "left top", of: this.container
    });
    this.overlay.width(this.container.width());
    this.overlay.height(this.container.height());
}


PIAS.Terminal = function(player, cb) {
    var self = this;
    this.player = player;
    var frame_source = PIAS.get_resource_url("terminal/terminal.html");
    this.frame = $("<iframe src='" + frame_source + "' width='800' height='240' />").appendTo(player.container);
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
          self.channel.bind("initialized", function(trans) {
              cb(null, self);
          });
      }
    });
}


PIAS.Terminal.prototype.write = function(data) {
    this.channel.notify({ method: "write", params: data });
}


PIAS.Terminal.prototype.close = function() {
    this.frame.remove();
}
