var sys = require('sys'),
    events = require('events');

function Podcast() {
    if(false === (this instanceof Podcast)) {
        return new Podcast();
    }

    events.EventEmitter.call(this);
}
sys.inherits(Podcast, events.EventEmitter);

Podcast.prototype.download = function(episode) {
    var self = this;

    var statusMessage = 'Downloading: ' + episode;
    self.emit('status', statusMessage);    

    setTimeout(function() {
        var finishedMessage = 'Downloaded ' + episode;
        self.emit('finished', finishedMessage);
    }, 5000);
}

module.exports = Podcast;