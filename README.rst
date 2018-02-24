
Status: Unmaintained
====================

.. image:: http://unmaintained.tech/badge.svg
     :target: http://unmaintained.tech/
     :alt: No Maintenance Intended

I am `no longer actively maintaining this project <https://rfk.id.au/blog/entry/archiving-open-source-projects/>`_.


JavaScript player for playitagainsam terminal sessions
======================================================

This is a JavaScript player for playitagainsam terminal sessions.

It's currently GPL'd, because it uses GPL'd code from shellinabox.com.
The file "jschannel.js" is MPL1.1/GPL2.0/LGPL2/1 triple licensed.

More licensing detials will be fleshed out here soon.  I am hoping to
get explicit permission from the shellinabox.com author to distribute
this under the MIT or similar license.  Maybe not.


Usage
-----

Serve the "playitagain-js" directory and all its contents from somewhere
on your website.  Include the following resources into your page, in order:

    *  playitagainsam-js/jquery-ui/jquery-1.7.2.min.js
    *  playitagainsam-js/jquery-ui/jquery-ui-1.8.22.custom.min.js
    *  playitagainsam-js/jschannel.js
    *  playitagainsam-js/playitagainsam.js
    *  playitagainsam-js/playitagainsam.css

Then when you want to play back a script, create a Player object within an
existing content div::

    var player = new PIAS.Player("#my-player-container");

Then ask it to play a script by loading it from a URL::

    player.play("./path/to/terminal-session.js");

Or by passing in a javascript object with the script data already loaded::

    player.play({"events" :[...event data here...]});

Pass a callback function as second argument if you want to know when the
session as finished being player.  Call the "destroy()" method if you want
to tear down the player early.  Watch this space for better documentation...
