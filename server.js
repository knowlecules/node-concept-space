/*
var Db = require('mongodb').Db,
  Connection = require('mongodb').Connection,
  Server = require('mongodb').Server,
  BSON = require('mongodb').BSONPure;

var Q = require("q");
var async = require("async");
var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : Connection.DEFAULT_PORT;

console.log("Connecting to " + host + ":" + port);
var db
var Test = function(host,port){
	db = new Db('node-mongo-eg', new Server(host, port, {}), {auto_reconnect: true});
};

Test.prototype.open =function(){
	 var result = Q.defer();
	 db.open(function(err, db) {
        if (err) {
            err.message = "Can't open database.";// + JSON.stringify(path) + " by way of C realpath: " + error.message;
            result.reject(error);
        } else {
            result.resolve();
        }
	});
	return result.promise;	
};

Test.prototype.close =function(err, cb){
	var result = Q.defer();
	db.close(false, function(err, db) {
        if (err) {
            err.message = "Can't close database.";// + JSON.stringify(path) + " by way of C realpath: " + error.message;
            result.reject(error);
        } else {
            result.resolve();
        }
	});	
	return true;
};

Test.prototype.build =function(){
	 var result = Q.defer();

	db.collection('test', function(err, collection) {        
	    // Remove all existing documents in collection
	      // Insert record with all the available types of values
        if (err) {
            err.message = "Can't access collection.";
            result.reject(error);
        } else {
	      collection.insert({
	        'array':[1,2,3], 
	        'string':'hello', 
	        'hash':{'a':1, 'b':2}, 
	        'date':new Date(),          // Stores only milisecond resolution
	        'oid':new BSON.ObjectID(),
	        'binary':new BSON.Binary("123"),
	        'int':42,
	        'float':33.3333,
	        'regexp':/foobar/i,
	        'regexp2':/foobar2/,
	        'boolean':true,
	        'where':new BSON.Code('this.x == 3'),
	        'dbref':new BSON.DBRef(collection.collectionName, new BSON.ObjectID()),
	        'null':null
	        }, function(err, doc) {
	          // Locate the first document
	          collection.findOne(function(err, document) {
	              if (err) {
	                  err.message = "Can't find document.";
	                  result.reject(error);
	              } else {
	            	  console.dir(document);
	              }
	         });
	    });
    }
    });
	return result.promise;	
};

var test = new Test(host, port);

test.open().then(function(){
	test.build().fin(function(){
		test.close();
	});
});

*/
var ConceptSpace = require('./lib/conceptSpace');

var integra = {name:'Integra', links:{context:"Manufacturer",members:[{name:'Acura'}]}};
var legend 	= {name:'Legend', links:{context:"Manufacturer",members:[{name:'Acura'}]}};
var vigor 	= {name:'Vigor', links:{context:"Manufacturer",members:[{name:'Acura'}]}};
var a5 	= {name:'A5', links:{context:"Manufacturer",members:[{name:'Audi'}]}};

var concept = {context:{name:"Model", attributes:{}, members:[integra,legend,vigor,a5, {name:'A4', attributes:{doors:4}
, tags:[{type:['madeBy','makes'], associate:[{context:{name:"Manufacturer", members:['Audi']}}], dissociate:[]}
       ,{type:['madeBy'], associate:[{context:{name:"Manufacturer", members:['Audi']}}]}
]}]}};
console.log("starting ");
var conceptSpace = new ConceptSpace('concept-space-test');

conceptSpace.open(function(err){
	conceptSpace.syncConcepts(concept, function(err,conceptSpace){
//		conceptSpace.close(true);	
		console.log("done");
	});
});

 