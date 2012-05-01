var vows = require('vows');
var ensurers = require('./vows.helpers.js');

// Ensure no failure when neither attributes nor properties specified
var contextWithNoAttrs = {name:"Models"};
var contextWithEmptyAttrs = {name:"Manufacturer", attributes:{}, properties:{index:[["name", 1]], indexOptions:{ unique: true}}, members:[]};
var schemaContext = {name:"Models", attributes:{}, properties:{index:[["name", 1]], indexOptions:{ unique: true}}};

var namedAxis = {axis:["has"]};
var directionalAxis = {axis:["makes","madeBy"]};
                  debugger;
//*
vows.describe('test context registry').addBatch( 
	ensurers.ensureEmptyOpenDatabase()).addBatch( 
//*/				
	
	ensurers.ensureContextRegisters(
			contextWithNoAttrs
				, "Single context:") ).addBatch( 
	ensurers.ensureContextRegisters(
			contextWithEmptyAttrs
				, "Single same context, but more complex.") ).addBatch( 
//*/				

	ensurers.ensureAxesRegisters(
			namedAxis
				, "Non directional axis:") ).addBatch( 
	ensurers.ensureAxesRegisters(
			directionalAxis
//*/				
			, "Directional axis") ).run(
					function(results){console.dir(results);});

//*/
//TODO: Test for duplication, index changing, malformed objects
