var cluster = require('cluster');

if (cluster.isMaster) {
    //start up workers for each cpu
    require('os').cpus().forEach(function() {
        cluster.fork();
    });

} else {
    //load up your application as a worker
    require('./benchmark.js');
}
